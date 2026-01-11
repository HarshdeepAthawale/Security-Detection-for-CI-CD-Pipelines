/**
 * Test script for Phase 2 data processing pipeline
 * Tests log parsing and feature extraction
 * @module test-pipeline
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseLog, validateParsedLog } from './parsers/logParser.js'
import { extractFeatures, getFeatureNames, validateFeatures, getFeatureCount } from './features/featureExtractor.js'
import { logger } from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Test the complete pipeline with a sample log file
 */
function testPipeline() {
  logger.info('='.repeat(60))
  logger.info('Testing Phase 2 Data Processing Pipeline')
  logger.info('='.repeat(60))
  
  const testFiles = [
    'sample-log.json',
    'sample-log-baseline.json',
    'sample-log-drifted.json',
    'sample-log-permission-escalation.json',
  ]
  
  let passedTests = 0
  let failedTests = 0
  
  testFiles.forEach((filename, index) => {
    logger.info(`\n--- Test ${index + 1}: ${filename} ---`)
    
    try {
      // Read sample log file
      const logPath = join(__dirname, '..', 'data', 'logs', filename)
      const logData = readFileSync(logPath, 'utf-8')
      
      // Step 1: Parse log
      logger.info('Step 1: Parsing log...')
      const parsedLog = parseLog(logData)
      
      // Validate parsed log
      if (!validateParsedLog(parsedLog)) {
        throw new Error('Parsed log validation failed')
      }
      
      logger.info(`✓ Parsed ${parsedLog.steps.length} steps from pipeline: ${parsedLog.pipeline}`)
      logger.info(`  Timestamp: ${parsedLog.timestamp}`)
      logger.info(`  Security steps: ${parsedLog.steps.filter(s => s.security).length}`)
      logger.info(`  Steps with secrets: ${parsedLog.steps.filter(s => s.secrets).length}`)
      logger.info(`  Approval steps: ${parsedLog.steps.filter(s => s.approval).length}`)
      
      // Step 2: Extract features
      logger.info('Step 2: Extracting features...')
      const features = extractFeatures(parsedLog)
      
      // Validate features
      if (!validateFeatures(features)) {
        throw new Error('Feature validation failed')
      }
      
      if (features.length !== getFeatureCount()) {
        throw new Error(`Expected ${getFeatureCount()} features, got ${features.length}`)
      }
      
      logger.info(`✓ Extracted ${features.length} features`)
      
      // Display feature values
      const featureNames = getFeatureNames()
      logger.info('  Feature values:')
      features.forEach((value, idx) => {
        logger.info(`    ${featureNames[idx]}: ${value.toFixed(4)}`)
      })
      
      // Verify all features are numeric
      const allNumeric = features.every(f => typeof f === 'number' && !isNaN(f) && isFinite(f))
      if (!allNumeric) {
        throw new Error('Some features are not numeric')
      }
      
      logger.info('✓ All features are numeric and valid')
      
      passedTests++
      logger.info(`\n✓ Test ${index + 1} PASSED`)
      
    } catch (error) {
      failedTests++
      logger.error(`\n✗ Test ${index + 1} FAILED: ${error.message}`)
      logger.error(error.stack)
    }
  })
  
  // Test edge cases
  logger.info('\n--- Edge Case Tests ---')
  
  // Test 1: Empty steps array
  try {
    logger.info('Test: Empty steps array...')
    const emptyLog = {
      pipeline: 'test',
      timestamp: new Date().toISOString(),
      steps: [],
    }
    const features = extractFeatures(emptyLog)
    if (features.length === getFeatureCount()) {
      logger.info('✓ Empty steps array handled correctly')
      passedTests++
    } else {
      throw new Error('Empty steps array test failed')
    }
  } catch (error) {
    logger.error(`✗ Empty steps array test failed: ${error.message}`)
    failedTests++
  }
  
  // Test 2: Invalid log data
  try {
    logger.info('Test: Invalid log data...')
    try {
      parseLog('invalid json')
      throw new Error('Should have thrown error for invalid JSON')
    } catch (error) {
      if (error.message.includes('Invalid JSON')) {
        logger.info('✓ Invalid log data handled correctly')
        passedTests++
      } else {
        throw error
      }
    }
  } catch (error) {
    logger.error(`✗ Invalid log data test failed: ${error.message}`)
    failedTests++
  }
  
  // Test 3: Missing fields
  try {
    logger.info('Test: Missing fields...')
    const minimalLog = {
      steps: [
        { name: 'test-step' }
      ]
    }
    const parsed = parseLog(minimalLog)
    if (parsed.pipeline && parsed.timestamp && parsed.steps.length === 1) {
      logger.info('✓ Missing fields handled correctly')
      passedTests++
    } else {
      throw new Error('Missing fields test failed')
    }
  } catch (error) {
    logger.error(`✗ Missing fields test failed: ${error.message}`)
    failedTests++
  }
  
  // Summary
  logger.info('\n' + '='.repeat(60))
  logger.info('Test Summary')
  logger.info('='.repeat(60))
  logger.info(`Total tests: ${passedTests + failedTests}`)
  logger.info(`Passed: ${passedTests}`)
  logger.info(`Failed: ${failedTests}`)
  
  if (failedTests === 0) {
    logger.info('\n✓ All tests PASSED!')
    process.exit(0)
  } else {
    logger.error('\n✗ Some tests FAILED!')
    process.exit(1)
  }
}

// Run tests
testPipeline()
