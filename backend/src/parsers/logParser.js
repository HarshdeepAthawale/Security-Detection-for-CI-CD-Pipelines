/**
 * Log parser for CI/CD pipeline logs (GitHub Actions style)
 * @module parsers/logParser
 */

import { logger } from '../utils/logger.js'

/**
 * Security-related keywords for step categorization
 * @type {string[]}
 */
const SECURITY_KEYWORDS = [
  'security',
  'scan',
  'audit',
  'test',
  'check',
  'verify',
  'validate',
  'dependency-check',
  'sast',
  'dast',
  'secrets',
  'token',
  'key',
  'vulnerability',
  'compliance',
  'policy',
]

/**
 * Step type keywords mapping
 * @type {Object.<string, string>}
 */
const STEP_TYPE_KEYWORDS = {
  security: ['security', 'scan', 'audit', 'sast', 'dast', 'vulnerability', 'compliance'],
  build: ['build', 'compile', 'make', 'docker'],
  test: ['test', 'unit', 'integration', 'e2e'],
  deploy: ['deploy', 'release', 'publish', 'push'],
  approval: ['approval', 'manual', 'gate', 'review'],
}

/**
 * Normalize step name (lowercase, trim)
 * @param {string} name - Step name
 * @returns {string} Normalized step name
 */
function normalizeStepName(name) {
  if (!name || typeof name !== 'string') {
    return ''
  }
  return name.toLowerCase().trim()
}

/**
 * Check if step is security-related based on name
 * @param {string} stepName - Step name
 * @returns {boolean} True if step is security-related
 */
function isSecurityStep(stepName) {
  const normalized = normalizeStepName(stepName)
  return SECURITY_KEYWORDS.some(keyword => normalized.includes(keyword))
}

/**
 * Determine step type from name
 * @param {string} stepName - Step name
 * @returns {string} Step type (security, build, test, deploy, approval, or 'other')
 */
function getStepType(stepName) {
  const normalized = normalizeStepName(stepName)
  
  for (const [type, keywords] of Object.entries(STEP_TYPE_KEYWORDS)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return type
    }
  }
  
  return 'other'
}

/**
 * Extract permissions from step configuration
 * @param {Object} step - Step object from log
 * @returns {string[]} Array of permission levels
 */
function extractPermissions(step) {
  const permissions = []
  
  // Check step.permissions (can be object or array)
  if (step.permissions) {
    if (Array.isArray(step.permissions)) {
      permissions.push(...step.permissions)
    } else if (typeof step.permissions === 'object') {
      // GitHub Actions style: { read: true, write: false, admin: false }
      Object.keys(step.permissions).forEach(perm => {
        if (step.permissions[perm] === true || step.permissions[perm] === 'true') {
          permissions.push(perm)
        }
      })
    } else if (typeof step.permissions === 'string') {
      permissions.push(step.permissions)
    }
  }
  
  // Check step.env for permission-related environment variables
  if (step.env) {
    Object.keys(step.env).forEach(key => {
      const value = step.env[key]
      if (typeof value === 'string' && (value.includes('read') || value.includes('write') || value.includes('admin'))) {
        const permMatch = value.match(/\b(read|write|admin)\b/i)
        if (permMatch) {
          permissions.push(permMatch[1].toLowerCase())
        }
      }
    })
  }
  
  return [...new Set(permissions)] // Remove duplicates
}

/**
 * Check if step uses secrets
 * @param {Object} step - Step object from log
 * @returns {boolean} True if step uses secrets
 */
function usesSecrets(step) {
  // Check for secrets in environment variables
  if (step.env) {
    const envKeys = Object.keys(step.env).map(k => k.toLowerCase())
    if (envKeys.some(key => key.includes('secret') || key.includes('token') || key.includes('key') || key.includes('password'))) {
      return true
    }
  }
  
  // Check for secrets in step inputs/parameters
  if (step.inputs) {
    const inputKeys = Object.keys(step.inputs).map(k => k.toLowerCase())
    if (inputKeys.some(key => key.includes('secret') || key.includes('token') || key.includes('key'))) {
      return true
    }
  }
  
  // Check for secrets in step name or description
  const stepText = `${step.name || ''} ${step.description || ''}`.toLowerCase()
  if (stepText.includes('secret') || stepText.includes('token') || stepText.includes('key')) {
    return true
  }
  
  return false
}

/**
 * Check if step requires manual approval
 * @param {Object} step - Step object from log
 * @returns {boolean} True if step requires approval
 */
function requiresApproval(step) {
  const stepText = `${step.name || ''} ${step.description || ''} ${step.type || ''}`.toLowerCase()
  return stepText.includes('approval') || 
         stepText.includes('manual') || 
         stepText.includes('gate') || 
         stepText.includes('review') ||
         step.type === 'approval'
}

/**
 * Parse a single step from the log
 * @param {Object} step - Raw step object from log
 * @param {number} executionOrder - Execution order index
 * @returns {Object} Parsed step object
 */
function parseStep(step, executionOrder) {
  if (!step || typeof step !== 'object') {
    logger.warn(`Invalid step at index ${executionOrder}:`, step)
    return null
  }
  
  const stepName = step.name || step.id || `step-${executionOrder}`
  const stepType = step.type || getStepType(stepName)
  const isSecurity = step.security !== undefined ? step.security : isSecurityStep(stepName)
  
  return {
    name: stepName,
    type: stepType,
    executionOrder: step.executionOrder !== undefined ? step.executionOrder : executionOrder,
    status: step.status || step.result || 'unknown',
    permissions: extractPermissions(step),
    security: isSecurity,
    secrets: usesSecrets(step),
    approval: requiresApproval(step),
  }
}

/**
 * Parse GitHub Actions style CI/CD log
 * @param {Object|string} logData - Raw log data (JSON object or JSON string)
 * @returns {Object} Parsed log data structure
 * @throws {Error} If log data is invalid or cannot be parsed
 */
export function parseLog(logData) {
  try {
    // Handle string input (JSON string)
    let log
    if (typeof logData === 'string') {
      try {
        log = JSON.parse(logData)
      } catch (parseError) {
        throw new Error(`Invalid JSON string: ${parseError.message}`)
      }
    } else if (typeof logData === 'object' && logData !== null) {
      log = logData
    } else {
      throw new Error('Log data must be a JSON object or JSON string')
    }
    
    // Validate required fields
    if (!log.steps && !Array.isArray(log.steps)) {
      logger.warn('Log missing steps array, using empty array')
      log.steps = []
    }
    
    // Extract pipeline name
    const pipeline = log.pipeline || log.pipelineName || log.name || 'unknown-pipeline'
    
    // Extract timestamp
    const timestamp = log.timestamp || log.created_at || log.time || new Date().toISOString()
    
    // Parse all steps
    const parsedSteps = []
    log.steps.forEach((step, index) => {
      const parsedStep = parseStep(step, index + 1)
      if (parsedStep) {
        parsedSteps.push(parsedStep)
      }
    })
    
    logger.debug(`Parsed ${parsedSteps.length} steps from pipeline: ${pipeline}`)
    
    return {
      pipeline,
      timestamp,
      steps: parsedSteps,
    }
  } catch (error) {
    logger.error('Error parsing log:', error)
    throw new Error(`Failed to parse log: ${error.message}`)
  }
}

/**
 * Validate parsed log structure
 * @param {Object} parsedLog - Parsed log object
 * @returns {boolean} True if log structure is valid
 */
export function validateParsedLog(parsedLog) {
  if (!parsedLog || typeof parsedLog !== 'object') {
    return false
  }
  
  if (typeof parsedLog.pipeline !== 'string' || !parsedLog.pipeline) {
    return false
  }
  
  if (typeof parsedLog.timestamp !== 'string' || !parsedLog.timestamp) {
    return false
  }
  
  if (!Array.isArray(parsedLog.steps)) {
    return false
  }
  
  // Validate each step
  for (const step of parsedLog.steps) {
    if (!step.name || typeof step.name !== 'string') {
      return false
    }
    if (typeof step.executionOrder !== 'number') {
      return false
    }
    if (!Array.isArray(step.permissions)) {
      return false
    }
  }
  
  return true
}
