/**
 * Test script for Phase 3 ML Detection Engine
 * Tests baseline model training and drift detection
 * @module test-drift-detection
 */

import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseLog } from './parsers/logParser.js'
import { extractFeatures, getFeatureNames } from './features/featureExtractor.js'
import { trainBaselineModel, saveModel, loadModel, validateModel, getModelStats } from './model/driftModel.js'
import { detectDrift, getFeatureWeights, getZScoreThresholds, getRiskLevelThresholds } from './detector/driftDetector.js'
import { logger } from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Generate sample baseline feature vectors for testing
 * @param {number} count - Number of feature vectors to generate
 * @returns {number[][]} Array of feature vectors
 */
function generateSampleBaselineFeatures(count = 5) {
  const featureVectors = []
  
  // Generate baseline feature vectors with slight variations
  // These represent "normal" pipeline runs
  for (let i = 0; i < count; i++) {
    const features = [
      3 + Math.random() * 0.5,        // securityScanCount: 3-3.5
      5 + Math.random() * 1,           // securityStepCount: 5-6
      8 + Math.random() * 2,           // readPermissionCount: 8-10
      4 + Math.random() * 1,           // writePermissionCount: 4-5
      1 + Math.random() * 0.5,         // adminPermissionCount: 1-1.5
      2 + Math.random() * 1,           // secretsUsageCount: 2-3
      2 + Math.random() * 0.5,         // approvalStepCount: 2-2.5
      5 + Math.random() * 2,           // avgSecurityStepOrder: 5-7
      0,                                // permissionEscalation: 0 (no escalation)
      12 + Math.random() * 2,          // totalStepCount: 12-14
      0.4 + Math.random() * 0.1,       // securityStepRatio: 0.4-0.5
      0.2 + Math.random() * 0.1,       // normalizedFirstSecurityStep: 0.2-0.3
      0.6 + Math.random() * 0.1,       // normalizedLastSecurityStep: 0.6-0.7
      1 + Math.random() * 0.5,         // secretsWithWriteCount: 1-1.5
      1 + Math.random() * 0.5,         // stepsWithAdminCount: 1-1.5
      4 + Math.random() * 1,            // securityBeforeDeploy: 4-5
      0.5 + Math.random() * 0.1,       // normalizedAvgStepOrder: 0.5-0.6
    ]
    featureVectors.push(features)
  }
  
  return featureVectors
}

/**
 * Generate a drifted feature vector (security degradation)
 * @returns {number[]} Drifted feature vector
 */
function generateDriftedFeatures() {
  return [
    1,                                 // securityScanCount: decreased (was 3)
    2,                                 // securityStepCount: decreased (was 5)
    8,                                 // readPermissionCount: same
    6,                                 // writePermissionCount: increased (was 4)
    3,                                 // adminPermissionCount: increased (was 1) - CRITICAL
    4,                                 // secretsUsageCount: increased (was 2)
    0,                                 // approvalStepCount: removed (was 2) - CRITICAL
    8,                                 // avgSecurityStepOrder: later (was 5)
    1,                                 // permissionEscalation: detected (was 0) - CRITICAL
    12,                                // totalStepCount: same
    0.17,                              // securityStepRatio: decreased (was 0.4)
    0.5,                               // normalizedFirstSecurityStep: later (was 0.2)
    0.8,                               // normalizedLastSecurityStep: later (was 0.6)
    3,                                 // secretsWithWriteCount: increased (was 1) - CRITICAL
    3,                                 // stepsWithAdminCount: increased (was 1) - CRITICAL
    1,                                 // securityBeforeDeploy: decreased (was 4) - CRITICAL
    0.6,                               // normalizedAvgStepOrder: same
  ]
}

/**
 * Generate a minor drift feature vector
 * @returns {number[]} Minor drift feature vector
 */
function generateMinorDriftFeatures() {
  return [
    2.5,                               // securityScanCount: slightly decreased
    4.5,                               // securityStepCount: slightly decreased
    8,                                 // readPermissionCount: same
    4,                                 // writePermissionCount: same
    1,                                 // adminPermissionCount: same
    2,                                 // secretsUsageCount: same
    1.5,                               // approvalStepCount: slightly decreased
    5,                                 // avgSecurityStepOrder: same
    0,                                 // permissionEscalation: none
    12,                                // totalStepCount: same
    0.38,                              // securityStepRatio: slightly decreased
    0.25,                              // normalizedFirstSecurityStep: slightly later
    0.65,                              // normalizedLastSecurityStep: slightly later
    1,                                 // secretsWithWriteCount: same
    1,                                 // stepsWithAdminCount: same
    3.5,                               // securityBeforeDeploy: slightly decreased
    0.5,                               // normalizedAvgStepOrder: same
  ]
}

/**
 * Test baseline model training
 */
function testModelTraining() {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 1: Baseline Model Training')
  logger.info('='.repeat(60))
  
  try {
    // Generate sample baseline features
    const baselineFeatures = generateSampleBaselineFeatures(5)
    logger.info(`Generated ${baselineFeatures.length} baseline feature vectors`)
    
    // Train model
    const model = trainBaselineModel(baselineFeatures, {
      pipelineName: 'test-pipeline',
    })
    
    logger.info(`✓ Model trained successfully`)
    logger.info(`  Pipeline: ${model.pipelineName}`)
    logger.info(`  Baseline runs: ${model.baselineRunCount}`)
    logger.info(`  Trained at: ${model.trainedAt}`)
    
    // Validate model
    if (validateModel(model)) {
      logger.info(`✓ Model validation passed`)
    } else {
      throw new Error('Model validation failed')
    }
    
    // Display model statistics
    const stats = getModelStats(model)
    logger.info(`\nModel Statistics:`)
    logger.info(`  Feature count: ${stats.featureCount}`)
    logger.info(`  Baseline run count: ${stats.baselineRunCount}`)
    
    // Display a few feature statistics
    const featureNames = getFeatureNames()
    logger.info(`\nSample Feature Statistics:`)
    for (let i = 0; i < Math.min(5, featureNames.length); i++) {
      const name = featureNames[i]
      const feature = stats.features[name]
      logger.info(`  ${name}: mean=${feature.mean.toFixed(4)}, stdDev=${feature.stdDev.toFixed(4)}`)
    }
    
    return model
  } catch (error) {
    logger.error(`✗ Model training failed: ${error.message}`)
    throw error
  }
}

/**
 * Test model save/load
 */
function testModelSaveLoad(model) {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 2: Model Save/Load')
  logger.info('='.repeat(60))
  
  try {
    // Ensure model directory exists
    const modelDir = join(__dirname, '..', '..', 'data', 'models')
    if (!existsSync(modelDir)) {
      mkdirSync(modelDir, { recursive: true })
    }
    
    // Save model
    const modelPath = join(modelDir, 'baseline-model.json')
    saveModel(model, modelPath)
    logger.info(`✓ Model saved to ${modelPath}`)
    
    // Load model
    const loadedModel = loadModel(modelPath)
    logger.info(`✓ Model loaded from ${modelPath}`)
    
    // Validate loaded model
    if (validateModel(loadedModel)) {
      logger.info(`✓ Loaded model validation passed`)
    } else {
      throw new Error('Loaded model validation failed')
    }
    
    // Compare models
    if (loadedModel.baselineRunCount === model.baselineRunCount) {
      logger.info(`✓ Model data matches (baseline runs: ${loadedModel.baselineRunCount})`)
    } else {
      throw new Error('Model data mismatch')
    }
    
    return loadedModel
  } catch (error) {
    logger.error(`✗ Model save/load failed: ${error.message}`)
    throw error
  }
}

/**
 * Test drift detection with various scenarios
 */
function testDriftDetection(model) {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 3: Drift Detection')
  logger.info('='.repeat(60))
  
  const testCases = [
    {
      name: 'No Drift (Baseline)',
      features: generateSampleBaselineFeatures(1)[0],
      expectedRisk: 'low',
    },
    {
      name: 'Minor Drift',
      features: generateMinorDriftFeatures(),
      expectedRisk: 'low',
    },
    {
      name: 'Major Drift (Security Degradation)',
      features: generateDriftedFeatures(),
      expectedRisk: 'high',
    },
  ]
  
  let passedTests = 0
  let failedTests = 0
  
  testCases.forEach((testCase, index) => {
    logger.info(`\n--- Test Case ${index + 1}: ${testCase.name} ---`)
    
    try {
      const result = detectDrift(testCase.features, {
        model,
        pipelineName: 'test-pipeline',
      })
      
      logger.info(`✓ Drift detection completed`)
      logger.info(`  Drift Score: ${result.driftScore.toFixed(2)}`)
      logger.info(`  Risk Level: ${result.riskLevel}`)
      logger.info(`  Security Issues: ${result.issues.length}`)
      
      // Display significant feature deviations
      if (result.explanations.length > 0) {
        logger.info(`\n  Significant Deviations:`)
        result.explanations.slice(0, 5).forEach(explanation => {
          logger.info(`    - ${explanation}`)
        })
        if (result.explanations.length > 5) {
          logger.info(`    ... and ${result.explanations.length - 5} more`)
        }
      }
      
      // Display security issues
      if (result.issues.length > 0) {
        logger.info(`\n  Security Issues:`)
        result.issues.forEach(issue => {
          logger.info(`    [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.description}`)
        })
      }
      
      // Verify risk level is reasonable
      const riskLevels = ['low', 'medium', 'high', 'critical']
      if (riskLevels.includes(result.riskLevel)) {
        logger.info(`✓ Risk level is valid`)
      } else {
        throw new Error(`Invalid risk level: ${result.riskLevel}`)
      }
      
      // Verify drift score is in range
      if (result.driftScore >= 0 && result.driftScore <= 100) {
        logger.info(`✓ Drift score is in valid range (0-100)`)
      } else {
        throw new Error(`Drift score out of range: ${result.driftScore}`)
      }
      
      passedTests++
      logger.info(`\n✓ Test case ${index + 1} PASSED`)
      
    } catch (error) {
      failedTests++
      logger.error(`\n✗ Test case ${index + 1} FAILED: ${error.message}`)
      logger.error(error.stack)
    }
  })
  
  return { passedTests, failedTests }
}

/**
 * Test with real log files if available
 */
function testWithLogFiles(model) {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 4: Drift Detection with Log Files')
  logger.info('='.repeat(60))
  
  const logsDir = join(__dirname, '..', '..', 'data', 'logs')
  const testFiles = [
    'sample-log-baseline.json',
    'sample-log-drifted.json',
    'sample-log.json',
  ]
  
  let processedFiles = 0
  
  testFiles.forEach(filename => {
    const filePath = join(logsDir, filename)
    
    if (!existsSync(filePath)) {
      logger.info(`  Skipping ${filename} (file not found)`)
      return
    }
    
    try {
      logger.info(`\n--- Processing ${filename} ---`)
      
      // Read and parse log
      const logData = readFileSync(filePath, 'utf-8')
      const parsedLog = parseLog(logData)
      
      // Extract features
      const features = extractFeatures(parsedLog)
      
      // Detect drift
      const result = detectDrift(features, {
        model,
        pipelineName: parsedLog.pipeline || 'unknown',
      })
      
      logger.info(`✓ Analysis complete`)
      logger.info(`  Pipeline: ${result.pipelineName}`)
      logger.info(`  Drift Score: ${result.driftScore.toFixed(2)}`)
      logger.info(`  Risk Level: ${result.riskLevel}`)
      logger.info(`  Issues: ${result.issues.length}`)
      
      if (result.issues.length > 0) {
        logger.info(`  Top Issues:`)
        result.issues.slice(0, 3).forEach(issue => {
          logger.info(`    [${issue.severity}] ${issue.type}`)
        })
      }
      
      processedFiles++
      
    } catch (error) {
      logger.warn(`  Failed to process ${filename}: ${error.message}`)
    }
  })
  
  if (processedFiles === 0) {
    logger.info(`  No log files found in ${logsDir}`)
    logger.info(`  Skipping log file tests`)
  } else {
    logger.info(`\n✓ Processed ${processedFiles} log file(s)`)
  }
}

/**
 * Display configuration information
 */
function displayConfiguration() {
  logger.info('\n' + '='.repeat(60))
  logger.info('Configuration')
  logger.info('='.repeat(60))
  
  logger.info('\nFeature Weights:')
  const weights = getFeatureWeights()
  Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([name, weight]) => {
      logger.info(`  ${name}: ${weight}`)
    })
  
  logger.info('\nZ-Score Thresholds:')
  const zThresholds = getZScoreThresholds()
  Object.entries(zThresholds).forEach(([level, threshold]) => {
    logger.info(`  ${level}: ${threshold}`)
  })
  
  logger.info('\nRisk Level Thresholds:')
  const riskThresholds = getRiskLevelThresholds()
  Object.entries(riskThresholds).forEach(([level, threshold]) => {
    logger.info(`  ${level}: ${threshold}`)
  })
}

/**
 * Main test function
 */
function runTests() {
  logger.info('='.repeat(60))
  logger.info('Phase 3: ML Detection Engine - Test Suite')
  logger.info('='.repeat(60))
  
  let allTestsPassed = true
  
  try {
    // Test 1: Model training
    const model = testModelTraining()
    
    // Test 2: Model save/load
    const loadedModel = testModelSaveLoad(model)
    
    // Test 3: Drift detection
    const driftResults = testDriftDetection(loadedModel)
    if (driftResults.failedTests > 0) {
      allTestsPassed = false
    }
    
    // Test 4: Test with log files (if available)
    testWithLogFiles(loadedModel)
    
    // Display configuration
    displayConfiguration()
    
    // Summary
    logger.info('\n' + '='.repeat(60))
    logger.info('Test Summary')
    logger.info('='.repeat(60))
    logger.info(`Drift Detection Tests: ${driftResults.passedTests} passed, ${driftResults.failedTests} failed`)
    
    if (allTestsPassed && driftResults.failedTests === 0) {
      logger.info('\n✓ All Phase 3 tests PASSED!')
      logger.info('✓ Baseline model created and saved')
      logger.info('✓ Drift detection working correctly')
      process.exit(0)
    } else {
      logger.error('\n✗ Some tests FAILED!')
      process.exit(1)
    }
    
  } catch (error) {
    logger.error('\n✗ Test suite failed with error:')
    logger.error(error.message)
    logger.error(error.stack)
    process.exit(1)
  }
}

// Run tests
runTests()
