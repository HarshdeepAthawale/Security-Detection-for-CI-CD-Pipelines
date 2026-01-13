/**
 * Universal log parser for any CI/CD format
 * Supports GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI, and generic JSON
 * @module parsers/universalLogParser
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
  
  // Check step.scopes (alternative field name)
  if (step.scopes && Array.isArray(step.scopes)) {
    permissions.push(...step.scopes)
  }
  
  // Check step.access (alternative field name)
  if (step.access && Array.isArray(step.access)) {
    permissions.push(...step.access)
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
  const stepText = `${step.name || ''} ${step.description || ''} ${step.id || ''}`.toLowerCase()
  if (stepText.includes('secret') || stepText.includes('token') || stepText.includes('key')) {
    return true
  }
  
  // Check for secrets in script content
  if (step.script || step.run || step.command) {
    const scriptText = `${step.script || ''} ${step.run || ''} ${step.command || ''}`.toLowerCase()
    if (scriptText.includes('secret') || scriptText.includes('token') || scriptText.includes('key')) {
      return true
    }
  }
  
  return false
}

/**
 * Check if step requires manual approval
 * @param {Object} step - Step object from log
 * @returns {boolean} True if step requires approval
 */
function requiresApproval(step) {
  const stepText = `${step.name || ''} ${step.description || ''} ${step.type || ''} ${step.id || ''}`.toLowerCase()
  return stepText.includes('approval') || 
         stepText.includes('manual') || 
         stepText.includes('gate') || 
         stepText.includes('review') ||
         step.type === 'approval' ||
         step.kind === 'approval'
}

/**
 * Detect CI/CD format from JSON structure
 * @param {Object} json - JSON object
 * @returns {string} Format type
 */
export function detectFormat(json) {
  if (!json || typeof json !== 'object') {
    return 'generic'
  }
  
  // GitHub Actions indicators
  if (json.workflow || json.workflow_run || (json.jobs && Array.isArray(json.jobs))) {
    return 'github-actions'
  }
  
  // GitLab CI indicators
  if (json.stages || json.before_script || json.after_script || json.image || json.services) {
    return 'gitlab-ci'
  }
  
  // Jenkins indicators
  if (json.stages && Array.isArray(json.stages) && json.stages[0] && json.stages[0].steps) {
    return 'jenkins'
  }
  
  // Azure DevOps indicators
  if (json.stages && Array.isArray(json.stages) && json.stages[0] && (json.stages[0].jobs || json.stages[0].phases)) {
    return 'azure-devops'
  }
  
  // CircleCI indicators
  if (json.jobs && typeof json.jobs === 'object' && !Array.isArray(json.jobs)) {
    return 'circleci'
  }
  
  // Check for standard format (has steps array)
  if (json.steps && Array.isArray(json.steps)) {
    return 'standard'
  }
  
  return 'generic'
}

/**
 * Extract pipeline name from JSON
 * @param {Object} json - JSON object
 * @param {string} format - Detected format
 * @returns {string} Pipeline name
 */
export function extractPipelineName(json, format) {
  // Try common field names
  const candidates = [
    json.pipeline,
    json.pipelineName,
    json.name,
    json.workflow,
    json.workflow_name,
    json.job?.name,
    json.definition?.name,
    json.repository?.name,
    json.project?.name,
    json.pipeline_name,
  ]
  
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }
  
  // Format-specific extraction
  if (format === 'github-actions') {
    if (json.workflow) return String(json.workflow)
    if (json.repository?.full_name) return json.repository.full_name
  }
  
  if (format === 'gitlab-ci') {
    if (json.project?.name) return json.project.name
  }
  
  if (format === 'jenkins') {
    if (json.pipeline) return String(json.pipeline)
  }
  
  // Generate fallback name
  return `pipeline-${Date.now()}`
}

/**
 * Extract timestamp from JSON
 * @param {Object} json - JSON object
 * @param {string} format - Detected format
 * @returns {string} ISO 8601 timestamp
 */
export function extractTimestamp(json, format) {
  // Try common field names
  const candidates = [
    json.timestamp,
    json.created_at,
    json.time,
    json.started_at,
    json.finished_at,
    json.date,
    json.run_date,
    json.created,
    json.start_time,
    json.end_time,
  ]
  
  for (const candidate of candidates) {
    if (candidate) {
      try {
        const date = new Date(candidate)
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      } catch (e) {
        // Continue to next candidate
      }
    }
  }
  
  // Use current time as fallback
  return new Date().toISOString()
}

/**
 * Recursively search for step-like arrays in JSON
 * @param {Object} obj - Object to search
 * @param {number} depth - Current depth (max 5)
 * @returns {Array} Found steps arrays
 */
function findStepArrays(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') {
    return []
  }
  
  const results = []
  
  // Check if this is an array of step-like objects
  if (Array.isArray(obj) && obj.length > 0) {
    const firstItem = obj[0]
    if (firstItem && typeof firstItem === 'object') {
      // Check if items have step-like properties
      const hasStepLikeProps = obj.some(item => 
        item && typeof item === 'object' && (
          item.name || item.id || item.step || item.action || item.script || item.task || item.label
        )
      )
      if (hasStepLikeProps) {
        results.push(obj)
      }
    }
  }
  
  // Recursively search nested objects
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const nested = findStepArrays(obj[key], depth + 1)
        results.push(...nested)
      }
    }
  }
  
  return results
}

/**
 * Extract steps from JSON based on format
 * @param {Object} json - JSON object
 * @param {string} format - Detected format
 * @returns {Array} Array of step objects
 */
export function extractSteps(json, format) {
  let steps = []
  
  // Format-specific extraction
  if (format === 'github-actions') {
    // GitHub Actions: jobs[].steps[] or steps[]
    if (json.steps && Array.isArray(json.steps)) {
      steps = json.steps
    } else if (json.jobs && Array.isArray(json.jobs)) {
      for (const job of json.jobs) {
        if (job.steps && Array.isArray(job.steps)) {
          steps.push(...job.steps)
        }
      }
    }
  } else if (format === 'gitlab-ci') {
    // GitLab CI: stages[].jobs[].script or before_script/after_script
    if (json.before_script && Array.isArray(json.before_script)) {
      steps.push(...json.before_script.map((script, idx) => ({
        name: `before-script-${idx + 1}`,
        script: script,
      })))
    }
    if (json.script && Array.isArray(json.script)) {
      steps.push(...json.script.map((script, idx) => ({
        name: `script-${idx + 1}`,
        script: script,
      })))
    } else if (json.script && typeof json.script === 'string') {
      steps.push({
        name: 'script',
        script: json.script,
      })
    }
    if (json.after_script && Array.isArray(json.after_script)) {
      steps.push(...json.after_script.map((script, idx) => ({
        name: `after-script-${idx + 1}`,
        script: script,
      })))
    }
    if (json.stages && Array.isArray(json.stages)) {
      for (const stage of json.stages) {
        if (stage.jobs && Array.isArray(stage.jobs)) {
          for (const job of stage.jobs) {
            if (job.script) {
              steps.push({
                name: job.name || job.stage || 'job',
                script: job.script,
                ...job,
              })
            }
          }
        }
      }
    }
  } else if (format === 'jenkins') {
    // Jenkins: stages[].steps[] or steps[]
    if (json.steps && Array.isArray(json.steps)) {
      steps = json.steps
    } else if (json.stages && Array.isArray(json.stages)) {
      for (const stage of json.stages) {
        if (stage.steps && Array.isArray(stage.steps)) {
          steps.push(...stage.steps)
        }
      }
    }
  } else if (format === 'azure-devops') {
    // Azure DevOps: stages[].jobs[].steps[] or phases[].steps[]
    if (json.stages && Array.isArray(json.stages)) {
      for (const stage of json.stages) {
        if (stage.jobs && Array.isArray(stage.jobs)) {
          for (const job of stage.jobs) {
            if (job.steps && Array.isArray(job.steps)) {
              steps.push(...job.steps)
            }
          }
        }
        if (stage.phases && Array.isArray(stage.phases)) {
          for (const phase of stage.phases) {
            if (phase.steps && Array.isArray(phase.steps)) {
              steps.push(...phase.steps)
            }
          }
        }
      }
    }
  } else if (format === 'circleci') {
    // CircleCI: jobs[].steps[] (jobs is an object, not array)
    if (json.jobs && typeof json.jobs === 'object') {
      for (const jobName in json.jobs) {
        const job = json.jobs[jobName]
        if (job.steps && Array.isArray(job.steps)) {
          steps.push(...job.steps.map(step => ({
            ...step,
            job: jobName,
          })))
        }
      }
    }
  } else if (format === 'standard') {
    // Standard format: steps[]
    if (json.steps && Array.isArray(json.steps)) {
      steps = json.steps
    }
  } else {
    // Generic: recursively search for step-like arrays
    const foundArrays = findStepArrays(json)
    if (foundArrays.length > 0) {
      // Use the largest array found
      steps = foundArrays.reduce((largest, arr) => 
        arr.length > largest.length ? arr : largest, []
      )
    }
  }
  
  // If no steps found, treat entire JSON as a single step (fallback)
  if (steps.length === 0) {
    logger.warn('No steps found in JSON, treating entire object as a single step')
    steps = [json]
  }
  
  return steps
}

/**
 * Normalize a step to standard format
 * @param {Object} step - Raw step object
 * @param {number} index - Step index (for execution order)
 * @param {string} format - Detected format
 * @returns {Object} Normalized step object
 */
export function normalizeStep(step, index, format) {
  if (!step || typeof step !== 'object') {
    return null
  }
  
  // Extract step name
  const stepName = step.name || 
                   step.id || 
                   step.step || 
                   step.action || 
                   step.task ||
                   step.label ||
                   step.job ||
                   `step-${index + 1}`
  
  // Extract type
  const stepType = step.type || 
                   step.category || 
                   step.kind ||
                   getStepType(String(stepName))
  
  // Extract execution order
  const executionOrder = step.executionOrder !== undefined ? step.executionOrder :
                        step.order !== undefined ? step.order :
                        step.index !== undefined ? step.index :
                        step.run_number !== undefined ? step.run_number :
                        index + 1
  
  // Extract permissions
  const permissions = extractPermissions(step)
  
  // Detect security step
  const isSecurity = step.security !== undefined ? step.security : isSecurityStep(String(stepName))
  
  // Detect secrets usage
  const secrets = step.secrets !== undefined ? step.secrets : usesSecrets(step)
  
  // Detect approval requirement
  const approval = step.approval !== undefined ? step.approval : requiresApproval(step)
  
  // Extract status
  const status = step.status || 
                 step.result || 
                 step.conclusion ||
                 step.state ||
                 'unknown'
  
  return {
    name: String(stepName),
    type: String(stepType),
    executionOrder: Number(executionOrder),
    status: String(status),
    permissions: Array.isArray(permissions) ? permissions : [],
    security: Boolean(isSecurity),
    secrets: Boolean(secrets),
    approval: Boolean(approval),
  }
}

/**
 * Parse any JSON format into standard pipeline log structure
 * @param {Object|string} logData - Raw log data (JSON object or JSON string)
 * @returns {Object} Parsed log data structure
 * @throws {Error} If log data is invalid or cannot be parsed
 */
export function parseUniversalLog(logData) {
  try {
    // Handle string input (JSON string)
    let json
    if (typeof logData === 'string') {
      try {
        json = JSON.parse(logData)
      } catch (parseError) {
        throw new Error(`Invalid JSON string: ${parseError.message}`)
      }
    } else if (typeof logData === 'object' && logData !== null) {
      json = logData
    } else {
      throw new Error('Log data must be a JSON object or JSON string')
    }
    
    // Detect format
    const format = detectFormat(json)
    logger.debug(`Detected format: ${format}`)
    
    // Extract pipeline name
    const pipeline = extractPipelineName(json, format)
    
    // Extract timestamp
    const timestamp = extractTimestamp(json, format)
    
    // Extract steps
    const rawSteps = extractSteps(json, format)
    
    // Normalize steps
    const parsedSteps = []
    rawSteps.forEach((step, index) => {
      const normalizedStep = normalizeStep(step, index, format)
      if (normalizedStep) {
        parsedSteps.push(normalizedStep)
      }
    })
    
    logger.debug(`Parsed ${parsedSteps.length} steps from ${format} format pipeline: ${pipeline}`)
    
    return {
      pipeline,
      timestamp,
      steps: parsedSteps,
      detectedFormat: format,
    }
  } catch (error) {
    logger.error('Error parsing universal log:', error)
    throw new Error(`Failed to parse log: ${error.message}`)
  }
}
