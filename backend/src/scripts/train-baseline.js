/**
 * Script to train initial baseline model from sample data
 * Usage: node src/scripts/train-baseline.js
 * @module scripts/train-baseline
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'
import { parseLog, validateParsedLog } from '../parsers/logParser.js'
import { extractFeatures } from '../features/featureExtractor.js'
import { trainBaselineModel, saveModel } from '../model/driftModel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Paths
const BACKEND_DIR = join(__dirname, '..', '..')
const LOGS_DIR = join(BACKEND_DIR, 'data', 'logs')
const MODELS_DIR = join(BACKEND_DIR, 'data', 'models')
const BASELINE_LOG_PATH = join(LOGS_DIR, 'sample-baseline.json')
const MODEL_PATH = join(MODELS_DIR, 'baseline-model.json')

/**
 * Load and parse a log file
 * @param {string} filePath - Path to log file
 * @returns {Object} Parsed log
 */
function loadLog(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Log file not found: ${filePath}`)
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const log = JSON.parse(content)
    return log
  } catch (error) {
    throw new Error(`Failed to load log file: ${error.message}`)
  }
}

/**
 * Main function to train baseline model
 */
async function trainBaseline() {
  try {
    logger.info('Starting baseline model training...')

    // Check if log file exists
    if (!existsSync(BASELINE_LOG_PATH)) {
      throw new Error(`Baseline log file not found: ${BASELINE_LOG_PATH}`)
    }

    // Load baseline log
    logger.info(`Loading baseline log from: ${BASELINE_LOG_PATH}`)
    const baselineLog = loadLog(BASELINE_LOG_PATH)

    // Create multiple variations of the baseline log for training
    // (We'll use the same log multiple times to create a baseline)
    // In a real scenario, you'd have multiple baseline runs
    const baselineLogs = [
      baselineLog,
      // Create a slight variation by copying (in real scenario, these would be different runs)
      { ...baselineLog, timestamp: new Date(Date.now() - 86400000).toISOString() }, // 1 day ago
      { ...baselineLog, timestamp: new Date(Date.now() - 172800000).toISOString() }, // 2 days ago
    ]

    logger.info(`Processing ${baselineLogs.length} baseline logs...`)

    // Parse all baseline logs and extract features
    const featureVectors = []
    const errors = []

    for (let i = 0; i < baselineLogs.length; i++) {
      try {
        const parsedLog = parseLog(baselineLogs[i])
        if (!validateParsedLog(parsedLog)) {
          errors.push(`Log ${i + 1}: validation failed`)
          logger.warn(`Log ${i + 1} validation failed`)
          continue
        }
        const features = extractFeatures(parsedLog)
        featureVectors.push(features)
        logger.debug(`Processed log ${i + 1} successfully`)
      } catch (error) {
        errors.push(`Log ${i + 1}: ${error.message}`)
        logger.warn(`Failed to process log ${i + 1}: ${error.message}`)
      }
    }

    // Check if we have enough valid logs
    if (featureVectors.length === 0) {
      throw new Error('No valid baseline logs could be processed')
    }

    if (featureVectors.length < 2) {
      throw new Error('At least 2 valid baseline logs are required for training')
    }

    logger.info(`Successfully processed ${featureVectors.length} baseline logs`)

    // Train model
    logger.info('Training baseline model...')
    const model = trainBaselineModel(featureVectors, {
      pipelineName: 'default',
    })

    logger.info(`Model trained successfully: ${model.baselineRunCount} runs, ${Object.keys(model.features).length} features`)

    // Save model
    logger.info(`Saving model to: ${MODEL_PATH}`)
    saveModel(model, MODEL_PATH)

    logger.info('✅ Baseline model training completed successfully!')
    logger.info(`Model saved to: ${MODEL_PATH}`)
    logger.info(`Model trained at: ${model.trainedAt}`)
    logger.info(`Baseline runs: ${model.baselineRunCount}`)
    logger.info(`Features: ${Object.keys(model.features).length}`)

    if (errors.length > 0) {
      logger.warn(`Warnings during training: ${errors.length} errors`)
    }

    return model
  } catch (error) {
    logger.error(`❌ Baseline model training failed: ${error.message}`)
    throw error
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('train-baseline.js')

if (isMainModule || process.argv[1]?.includes('train-baseline')) {
  trainBaseline()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Training failed:', error)
      process.exit(1)
    })
}

export { trainBaseline }
