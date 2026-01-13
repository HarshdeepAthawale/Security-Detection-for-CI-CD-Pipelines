/**
 * API routes for drift detection and analysis
 * @module api/driftRoutes
 */

import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readdir, readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { logger } from '../utils/logger.js'
import { parseLog, validateParsedLog } from '../parsers/logParser.js'
import { extractFeatures } from '../features/featureExtractor.js'
import { detectDrift } from '../detector/driftDetector.js'
import { trainBaselineModel, saveModel, loadModel } from '../model/driftModel.js'
import { storeAnalysis, getAnalysisHistory, getStatistics, getAnalysesByPipeline } from '../utils/storage.js'
import { formatDriftAnalysis, generateReport, generatePipelineComparison } from '../report/reportGenerator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

/**
 * POST /api/analyze
 * Analyze a CI/CD log for security drift
 */
router.post('/analyze', async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body is required',
      })
    }

    const { pipeline, log, timestamp } = req.body

    // Production safety: Reject test/sample data in production
    if (process.env.NODE_ENV === 'production') {
      const pipelineName = pipeline || log?.pipeline || log?.pipelineName || ''
      if (pipelineName.toLowerCase().includes('test') || 
          pipelineName.toLowerCase().includes('sample') ||
          pipelineName.toLowerCase().includes('mock') ||
          pipelineName.toLowerCase().includes('dummy')) {
        logger.warn(`Rejected analysis request with test/sample pipeline name in production: ${pipelineName}`)
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Test or sample pipeline names are not allowed in production',
        })
      }
    }

    // Validate required fields
    if (!log) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing required field: log',
      })
    }

    // Use provided pipeline name or extract from log
    const pipelineName = pipeline || log.pipeline || log.pipelineName || 'unknown-pipeline'
    const logTimestamp = timestamp || log.timestamp || new Date().toISOString()

    logger.info(`Analyzing pipeline: ${pipelineName}`)

    // Step 1: Parse log
    let parsedLog
    try {
      parsedLog = parseLog(log)
      parsedLog.pipeline = pipelineName
      parsedLog.timestamp = logTimestamp
    } catch (error) {
      logger.error(`Log parsing failed: ${error.message}`)
      return res.status(400).json({
        error: 'Invalid log format',
        message: `Failed to parse log: ${error.message}`,
      })
    }

    // Validate parsed log
    if (!validateParsedLog(parsedLog)) {
      return res.status(400).json({
        error: 'Invalid log format',
        message: 'Parsed log validation failed',
      })
    }

    // Step 2: Extract features
    let features
    try {
      features = extractFeatures(parsedLog)
    } catch (error) {
      logger.error(`Feature extraction failed: ${error.message}`)
      return res.status(500).json({
        error: 'Feature extraction failed',
        message: error.message,
      })
    }

    // Step 3: Detect drift
    let analysis
    try {
      analysis = detectDrift(features, {
        pipelineName,
      })
      analysis.timestamp = logTimestamp
      // Store parsed steps for pipeline comparison
      analysis.parsedSteps = parsedLog.steps || []
    } catch (error) {
      logger.error(`Drift detection failed: ${error.message}`)
      return res.status(500).json({
        error: 'Drift detection failed',
        message: error.message,
      })
    }

    // Step 4: Store analysis
    try {
      await storeAnalysis(analysis)
    } catch (error) {
      logger.warn(`Failed to store analysis: ${error.message}`)
      // Continue even if storage fails
    }

    // Step 5: Get recent history for trend calculation
    let recentHistory = []
    try {
      recentHistory = await getAnalysisHistory({
        pipeline: pipelineName,
        limit: 10,
      })
    } catch (error) {
      logger.warn(`Failed to fetch history for trend: ${error.message}`)
      // Continue without trend data
    }

    // Step 6: Format response with trend
    const response = formatDriftAnalysis(analysis, recentHistory)

    logger.info(`Analysis complete: score=${analysis.driftScore}, risk=${analysis.riskLevel}`)

    res.status(200).json(response)

  } catch (error) {
    logger.error('Unexpected error in /api/analyze:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/history
 * Get analysis history and timeline data
 */
router.get('/history', async (req, res) => {
  try {
    // Extract query parameters
    const pipeline = req.query.pipeline
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100
    const since = req.query.since

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Limit must be between 1 and 1000',
      })
    }

    // Get filtered history
    const history = await getAnalysisHistory({
      pipeline,
      limit,
      since,
    })

    // Get statistics (exclude test data in production)
    const stats = await getStatistics({
      excludeTestData: process.env.NODE_ENV === 'production',
    })

    // Generate report data
    const report = generateReport(
      history.length > 0 ? history[0] : null,
      history,
      stats
    )

    logger.info(`Returning ${history.length} analyses from history`)

    // Format each analysis with trend data from history
    const formattedHistory = history.map((analysis, index) => {
      // Pass history to calculate trend for each analysis
      return formatDriftAnalysis(analysis, history)
    })

    res.status(200).json({
      history: formattedHistory,
      timeline: report.timeline,
      stats: report.stats,
    })

  } catch (error) {
    logger.error('Unexpected error in /api/history:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * POST /api/train
 * Train or retrain the baseline model
 */
router.post('/train', async (req, res) => {
  try {
    // Validate request body
    if (!req.body || !req.body.baselineLogs) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing required field: baselineLogs',
      })
    }

    const { baselineLogs, modelName } = req.body

    // Validate baselineLogs
    if (!Array.isArray(baselineLogs) || baselineLogs.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'baselineLogs must be a non-empty array',
      })
    }

    logger.info(`Training baseline model from ${baselineLogs.length} logs`)

    // Parse all baseline logs and extract features
    const featureVectors = []
    const errors = []

    for (let i = 0; i < baselineLogs.length; i++) {
      try {
        const parsedLog = parseLog(baselineLogs[i])
        if (!validateParsedLog(parsedLog)) {
          errors.push(`Log ${i + 1}: validation failed`)
          continue
        }
        const features = extractFeatures(parsedLog)
        featureVectors.push(features)
      } catch (error) {
        errors.push(`Log ${i + 1}: ${error.message}`)
        logger.warn(`Failed to process baseline log ${i + 1}: ${error.message}`)
      }
    }

    // Check if we have enough valid logs
    if (featureVectors.length === 0) {
      return res.status(400).json({
        error: 'Training failed',
        message: 'No valid baseline logs could be processed',
        errors,
      })
    }

    if (featureVectors.length < 2) {
      return res.status(400).json({
        error: 'Training failed',
        message: 'At least 2 valid baseline logs are required for training',
        errors,
      })
    }

    // Train model
    let model
    try {
      model = trainBaselineModel(featureVectors, {
        pipelineName: modelName || 'default',
      })
    } catch (error) {
      logger.error(`Model training failed: ${error.message}`)
      return res.status(500).json({
        error: 'Training failed',
        message: error.message,
      })
    }

    // Save model
    const modelFileName = modelName 
      ? `${modelName}-model.json` 
      : 'baseline-model.json'
    
    try {
      const modelPath = join(__dirname, '..', '..', 'data', 'models', modelFileName)
      saveModel(model, modelPath)
    } catch (error) {
      logger.error(`Model save failed: ${error.message}`)
      return res.status(500).json({
        error: 'Model save failed',
        message: error.message,
      })
    }

    logger.info(`Model trained successfully: ${model.baselineRunCount} runs, ${Object.keys(model.features).length} features`)

    res.status(200).json({
      status: 'success',
      modelName: modelName || 'baseline-model',
      trainedAt: model.trainedAt,
      baselineRunCount: model.baselineRunCount,
      features: Object.keys(model.features).length,
      processedLogs: featureVectors.length,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    logger.error('Unexpected error in /api/train:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/pipelines/:pipelineName
 * Get pipeline comparison data (baseline vs current)
 */
router.get('/pipelines/:pipelineName', async (req, res) => {
  try {
    const { pipelineName } = req.params

    if (!pipelineName) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Pipeline name is required',
      })
    }

    logger.info(`Fetching pipeline comparison for: ${pipelineName}`)

    // Get all analyses for this pipeline, sorted by timestamp (newest first)
    const analyses = await getAnalysesByPipeline(pipelineName, 1000)
    
    if (analyses.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: `No analyses found for pipeline: ${pipelineName}`,
      })
    }

    // Get baseline (oldest analysis) and current (newest analysis)
    // analyses are sorted newest first, so [0] is newest, [length-1] is oldest
    const baselineAnalysis = analyses[analyses.length - 1] // Oldest (first uploaded)
    const currentAnalysis = analyses[0] // Newest (latest uploaded)

    // Extract steps from analyses
    const baselineSteps = baselineAnalysis.parsedSteps || []
    const currentSteps = currentAnalysis.parsedSteps || []

    // Generate comparison
    const comparison = generatePipelineComparison(baselineSteps, currentSteps)

    logger.info(`Pipeline comparison generated: ${comparison.baseline.length} baseline steps, ${comparison.current.length} current steps`)

    res.status(200).json({
      pipelineName,
      baseline: comparison.baseline,
      current: comparison.current,
      baselineTimestamp: baselineAnalysis.timestamp,
      currentTimestamp: currentAnalysis.timestamp,
    })

  } catch (error) {
    logger.error('Unexpected error in /api/pipelines/:pipelineName:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/pipeline-logs
 * List all available pipeline log JSON files
 */
router.get('/pipeline-logs', async (req, res) => {
  try {
    // Get project root directory (go up from backend/src/api to project root)
    const projectRoot = join(__dirname, '..', '..', '..')
    
    logger.info(`Scanning for pipeline log files in: ${projectRoot}`)

    // Read directory and filter for pipeline log JSON files
    const files = await readdir(projectRoot)
    const pipelineLogFiles = files
      .filter(file => file.startsWith('pipeline-log-') && file.endsWith('.json'))
      .map(async (file) => {
        const filePath = join(projectRoot, file)
        try {
          const stats = await stat(filePath)
          // Read file to get pipeline name and timestamp
          const content = await readFile(filePath, 'utf-8')
          const logData = JSON.parse(content)
          
          return {
            filename: file,
            pipelineName: logData.pipeline || logData.pipelineName || file.replace('.json', ''),
            timestamp: logData.timestamp || stats.mtime.toISOString(),
            size: stats.size,
            modified: stats.mtime.toISOString(),
          }
        } catch (error) {
          logger.warn(`Failed to read pipeline log file ${file}: ${error.message}`)
          return {
            filename: file,
            pipelineName: file.replace('.json', ''),
            timestamp: new Date().toISOString(),
            size: 0,
            modified: new Date().toISOString(),
            error: error.message,
          }
        }
      })

    const pipelineLogs = await Promise.all(pipelineLogFiles)
    
    // Sort by filename (which includes the number)
    pipelineLogs.sort((a, b) => a.filename.localeCompare(b.filename))

    logger.info(`Found ${pipelineLogs.length} pipeline log files`)

    res.status(200).json({
      logs: pipelineLogs,
      count: pipelineLogs.length,
    })

  } catch (error) {
    logger.error('Unexpected error in /api/pipeline-logs:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * GET /api/pipeline-logs/:filename
 * Get a specific pipeline log file content
 */
router.get('/pipeline-logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params

    // Security: Validate filename to prevent path traversal
    if (!filename.startsWith('pipeline-log-') || !filename.endsWith('.json')) {
      return res.status(400).json({
        error: 'Invalid filename',
        message: 'Filename must start with "pipeline-log-" and end with ".json"',
      })
    }

    // Get project root directory
    const projectRoot = join(__dirname, '..', '..', '..')
    const filePath = join(projectRoot, filename)

    // Check if file exists
    if (!existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: `Pipeline log file "${filename}" not found`,
      })
    }

    // Read and return file content
    const content = await readFile(filePath, 'utf-8')
    const logData = JSON.parse(content)

    logger.info(`Serving pipeline log file: ${filename}`)

    res.status(200).json({
      filename,
      data: logData,
    })

  } catch (error) {
    logger.error(`Unexpected error in /api/pipeline-logs/${req.params.filename}:`, error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * POST /api/pipeline-logs/:filename/process
 * Process a pipeline log file and add it to analysis history
 */
router.post('/pipeline-logs/:filename/process', async (req, res) => {
  try {
    const { filename } = req.params

    // Security: Validate filename
    if (!filename.startsWith('pipeline-log-') || !filename.endsWith('.json')) {
      return res.status(400).json({
        error: 'Invalid filename',
        message: 'Filename must start with "pipeline-log-" and end with ".json"',
      })
    }

    // Get project root directory
    const projectRoot = join(__dirname, '..', '..', '..')
    const filePath = join(projectRoot, filename)

    // Check if file exists
    if (!existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: `Pipeline log file "${filename}" not found`,
      })
    }

    // Read file content
    const content = await readFile(filePath, 'utf-8')
    const logData = JSON.parse(content)

    // Extract pipeline name and timestamp
    const pipelineName = logData.pipeline || logData.pipelineName || filename.replace('.json', '')
    const logTimestamp = logData.timestamp || new Date().toISOString()

    logger.info(`Processing pipeline log file: ${filename} for pipeline: ${pipelineName}`)

    // Step 1: Parse log
    let parsedLog
    try {
      parsedLog = parseLog(logData)
      parsedLog.pipeline = pipelineName
      parsedLog.timestamp = logTimestamp
    } catch (error) {
      logger.error(`Log parsing failed: ${error.message}`)
      return res.status(400).json({
        error: 'Invalid log format',
        message: `Failed to parse log: ${error.message}`,
      })
    }

    // Validate parsed log
    if (!validateParsedLog(parsedLog)) {
      return res.status(400).json({
        error: 'Invalid log format',
        message: 'Parsed log validation failed',
      })
    }

    // Step 2: Extract features
    let features
    try {
      features = extractFeatures(parsedLog)
    } catch (error) {
      logger.error(`Feature extraction failed: ${error.message}`)
      return res.status(500).json({
        error: 'Feature extraction failed',
        message: error.message,
      })
    }

    // Step 3: Detect drift
    let analysis
    try {
      analysis = detectDrift(features, {
        pipelineName,
      })
      analysis.timestamp = logTimestamp
      analysis.parsedSteps = parsedLog.steps || []
    } catch (error) {
      logger.error(`Drift detection failed: ${error.message}`)
      return res.status(500).json({
        error: 'Drift detection failed',
        message: error.message,
      })
    }

    // Step 4: Store analysis
    try {
      await storeAnalysis(analysis)
      logger.info(`Successfully processed and stored analysis for ${filename}`)
    } catch (error) {
      logger.warn(`Failed to store analysis: ${error.message}`)
      return res.status(500).json({
        error: 'Storage failed',
        message: error.message,
      })
    }

    // Step 5: Format response
    const recentHistory = await getAnalysisHistory({
      pipeline: pipelineName,
      limit: 10,
    })
    const response = formatDriftAnalysis(analysis, recentHistory)

    res.status(200).json({
      status: 'success',
      message: `Pipeline log "${filename}" processed successfully`,
      analysis: response,
    })

  } catch (error) {
    logger.error(`Unexpected error processing pipeline log ${req.params.filename}:`, error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

export default router
