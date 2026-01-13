/**
 * Test script for Phase 4 API endpoints
 * Tests all API routes with sample data
 * @module test-api
 */

import { logger } from './utils/logger.js'

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001'

/**
 * Make HTTP request
 */
async function request(method, path, body = null) {
  const url = `${API_BASE_URL}${path}`
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()
    return {
      status: response.status,
      ok: response.ok,
      data,
    }
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    }
  }
}

/**
 * Generate sample CI/CD log
 */
function generateSampleLog(pipelineName = 'test-pipeline', options = {}) {
  const hasSecurityIssues = options.hasSecurityIssues || false
  
  const steps = [
    {
      name: 'checkout',
      type: 'build',
      permissions: ['read'],
      executionOrder: 1,
    },
    {
      name: 'security-scan',
      type: 'security',
      security: true,
      permissions: ['read'],
      executionOrder: 2,
    },
    {
      name: 'build',
      type: 'build',
      permissions: ['read', 'write'],
      executionOrder: 3,
    },
  ]

  // Add problematic steps if requested
  if (hasSecurityIssues) {
    // Remove security scan
    steps.splice(1, 1)
    // Add admin permission step
    steps.push({
      name: 'deploy',
      type: 'deploy',
      permissions: ['read', 'write', 'admin'],
      executionOrder: 3,
    })
  } else {
    steps.push({
      name: 'test',
      type: 'test',
      permissions: ['read'],
      executionOrder: 4,
    })
    steps.push({
      name: 'approval',
      type: 'approval',
      approval: true,
      permissions: ['read'],
      executionOrder: 5,
    })
  }

  return {
    pipeline: pipelineName,
    timestamp: new Date().toISOString(),
    steps,
  }
}

/**
 * Test POST /api/analyze
 */
async function testAnalyze() {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 1: POST /api/analyze')
  logger.info('='.repeat(60))

  // Test 1.1: Analyze normal pipeline
  logger.info('\n--- Test 1.1: Normal Pipeline ---')
  const normalLog = generateSampleLog('test-pipeline-normal', { hasSecurityIssues: false })
  const result1 = await request('POST', '/api/analyze', {
    pipeline: 'test-pipeline-normal',
    log: normalLog,
  })

  if (result1.ok && result1.data.driftScore !== undefined) {
    logger.info(`✓ Analysis successful`)
    logger.info(`  Pipeline: ${result1.data.pipelineName}`)
    logger.info(`  Drift Score: ${result1.data.driftScore}`)
    logger.info(`  Risk Level: ${result1.data.riskLevel}`)
    logger.info(`  Issues: ${result1.data.issues.length}`)
  } else {
    logger.error(`✗ Analysis failed: ${result1.error || result1.data.message}`)
    return false
  }

  // Test 1.2: Analyze pipeline with security issues
  logger.info('\n--- Test 1.2: Pipeline with Security Issues ---')
  const driftedLog = generateSampleLog('test-pipeline-drifted', { hasSecurityIssues: true })
  const result2 = await request('POST', '/api/analyze', {
    pipeline: 'test-pipeline-drifted',
    log: driftedLog,
  })

  if (result2.ok && result2.data.driftScore !== undefined) {
    logger.info(`✓ Analysis successful`)
    logger.info(`  Pipeline: ${result2.data.pipelineName}`)
    logger.info(`  Drift Score: ${result2.data.driftScore}`)
    logger.info(`  Risk Level: ${result2.data.riskLevel}`)
    logger.info(`  Issues: ${result2.data.issues.length}`)
    if (result2.data.issues.length > 0) {
      logger.info(`  Top Issues:`)
      result2.data.issues.slice(0, 3).forEach(issue => {
        logger.info(`    [${issue.severity}] ${issue.type}`)
      })
    }
  } else {
    logger.error(`✗ Analysis failed: ${result2.error || result2.data.message}`)
    return false
  }

  // Test 1.3: Invalid request
  logger.info('\n--- Test 1.3: Invalid Request ---')
  const result3 = await request('POST', '/api/analyze', {
    // Missing log field
  })

  if (!result3.ok && result3.status === 400) {
    logger.info(`✓ Invalid request correctly rejected`)
  } else {
    logger.error(`✗ Invalid request not properly handled`)
    return false
  }

  return true
}

/**
 * Test GET /api/history
 */
async function testHistory() {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 2: GET /api/history')
  logger.info('='.repeat(60))

  // Test 2.1: Get all history
  logger.info('\n--- Test 2.1: Get All History ---')
  const result1 = await request('GET', '/api/history')

  if (result1.ok && Array.isArray(result1.data.history)) {
    logger.info(`✓ History retrieved successfully`)
    logger.info(`  Total analyses: ${result1.data.history.length}`)
    logger.info(`  Timeline points: ${result1.data.timeline.length}`)
    logger.info(`  Stats: ${JSON.stringify(result1.data.stats)}`)
  } else {
    logger.error(`✗ History retrieval failed: ${result1.error || result1.data.message}`)
    return false
  }

  // Test 2.2: Filter by pipeline
  logger.info('\n--- Test 2.2: Filter by Pipeline ---')
  const result2 = await request('GET', '/api/history?pipeline=test-pipeline-normal')

  if (result2.ok && Array.isArray(result2.data.history)) {
    logger.info(`✓ Filtered history retrieved`)
    logger.info(`  Filtered analyses: ${result2.data.history.length}`)
  } else {
    logger.error(`✗ Filtered history failed: ${result2.error || result2.data.message}`)
    return false
  }

  // Test 2.3: Limit results
  logger.info('\n--- Test 2.3: Limit Results ---')
  const result3 = await request('GET', '/api/history?limit=1')

  if (result3.ok && result3.data.history.length <= 1) {
    logger.info(`✓ Limit applied correctly`)
    logger.info(`  Limited results: ${result3.data.history.length}`)
  } else {
    logger.error(`✗ Limit not applied correctly`)
    return false
  }

  return true
}

/**
 * Test POST /api/train
 */
async function testTrain() {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 3: POST /api/train')
  logger.info('='.repeat(60))

  // Generate baseline logs
  const baselineLogs = []
  for (let i = 0; i < 5; i++) {
    baselineLogs.push(generateSampleLog(`baseline-pipeline-${i}`, { hasSecurityIssues: false }))
  }

  logger.info('\n--- Test 3.1: Train Model ---')
  const result1 = await request('POST', '/api/train', {
    baselineLogs,
    modelName: 'test-baseline',
  })

  if (result1.ok && result1.data.status === 'success') {
    logger.info(`✓ Model training successful`)
    logger.info(`  Model: ${result1.data.modelName}`)
    logger.info(`  Baseline runs: ${result1.data.baselineRunCount}`)
    logger.info(`  Features: ${result1.data.features}`)
  } else {
    logger.error(`✗ Model training failed: ${result1.error || result1.data.message}`)
    return false
  }

  // Test 3.2: Invalid request
  logger.info('\n--- Test 3.2: Invalid Request ---')
  const result2 = await request('POST', '/api/train', {
    // Missing baselineLogs
  })

  if (!result2.ok && result2.status === 400) {
    logger.info(`✓ Invalid request correctly rejected`)
  } else {
    logger.error(`✗ Invalid request not properly handled`)
    return false
  }

  return true
}

/**
 * Test health endpoint
 */
async function testHealth() {
  logger.info('\n' + '='.repeat(60))
  logger.info('Test 4: GET /health')
  logger.info('='.repeat(60))

  const result = await request('GET', '/health')

  if (result.ok && result.data.status === 'ok') {
    logger.info(`✓ Health check passed`)
    logger.info(`  Status: ${result.data.status}`)
    logger.info(`  Service: ${result.data.service}`)
    return true
  } else {
    logger.error(`✗ Health check failed: ${result.error || result.data.message}`)
    return false
  }
}

/**
 * Main test function
 */
async function runTests() {
  logger.info('='.repeat(60))
  logger.info('Phase 4: API & Reporting Layer - Test Suite')
  logger.info('='.repeat(60))
  logger.info(`Testing API at: ${API_BASE_URL}`)
  logger.info('\nNote: Make sure the server is running (npm start)')

  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000))

  let allTestsPassed = true

  // Test health endpoint first
  const healthPassed = await testHealth()
  if (!healthPassed) {
    logger.error('\n✗ Server is not responding. Please start the server first.')
    logger.error('  Run: cd backend && npm start')
    process.exit(1)
  }

  // Run tests
  const test1 = await testAnalyze()
  const test2 = await testHistory()
  const test3 = await testTrain()

  allTestsPassed = test1 && test2 && test3

  // Summary
  logger.info('\n' + '='.repeat(60))
  logger.info('Test Summary')
  logger.info('='.repeat(60))
  logger.info(`POST /api/analyze: ${test1 ? '✓ PASSED' : '✗ FAILED'}`)
  logger.info(`GET /api/history: ${test2 ? '✓ PASSED' : '✗ FAILED'}`)
  logger.info(`POST /api/train: ${test3 ? '✓ PASSED' : '✗ FAILED'}`)
  logger.info(`GET /health: ${healthPassed ? '✓ PASSED' : '✗ FAILED'}`)

  if (allTestsPassed && healthPassed) {
    logger.info('\n✓ All Phase 4 API tests PASSED!')
    process.exit(0)
  } else {
    logger.error('\n✗ Some tests FAILED!')
    process.exit(1)
  }
}

// Run tests
runTests().catch(error => {
  logger.error('Test suite failed with error:', error)
  process.exit(1)
})
