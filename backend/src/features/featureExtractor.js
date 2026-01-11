/**
 * Feature extractor for converting parsed logs to numeric feature vectors
 * @module features/featureExtractor
 */

import { logger } from '../utils/logger.js'

/**
 * Extract numeric features from parsed log data
 * @param {Object} parsedLog - Parsed log object from logParser
 * @returns {number[]} Array of numeric features
 * @throws {Error} If parsed log is invalid
 */
export function extractFeatures(parsedLog) {
  if (!parsedLog || !parsedLog.steps || !Array.isArray(parsedLog.steps)) {
    throw new Error('Invalid parsed log: steps array is required')
  }
  
  const steps = parsedLog.steps
  
  // Feature 1: Security scan steps count
  const securityScanCount = steps.filter(step => 
    step.security && 
    (normalizeStepName(step.name).includes('scan') || 
     normalizeStepName(step.name).includes('check'))
  ).length
  
  // Feature 2: Total security-related steps count
  const securityStepCount = steps.filter(step => step.security === true).length
  
  // Feature 3: Read permission count
  const readPermissionCount = steps.filter(step => 
    step.permissions && step.permissions.includes('read')
  ).length
  
  // Feature 4: Write permission count
  const writePermissionCount = steps.filter(step => 
    step.permissions && step.permissions.includes('write')
  ).length
  
  // Feature 5: Admin permission count
  const adminPermissionCount = steps.filter(step => 
    step.permissions && step.permissions.includes('admin')
  ).length
  
  // Feature 6: Secrets usage count
  const secretsUsageCount = steps.filter(step => step.secrets === true).length
  
  // Feature 7: Manual approval steps count
  const approvalStepCount = steps.filter(step => step.approval === true).length
  
  // Feature 8: Average execution order of security steps
  const securitySteps = steps.filter(step => step.security === true)
  const avgSecurityStepOrder = securitySteps.length > 0
    ? securitySteps.reduce((sum, step) => sum + step.executionOrder, 0) / securitySteps.length
    : 0
  
  // Feature 9: Permission escalation indicator (0 or 1)
  // Escalation occurs if permissions increase from read -> write -> admin
  const permissionEscalation = detectPermissionEscalation(steps) ? 1 : 0
  
  // Feature 10: Total number of steps
  const totalStepCount = steps.length
  
  // Feature 11: Security steps ratio (security steps / total steps)
  const securityStepRatio = totalStepCount > 0 ? securityStepCount / totalStepCount : 0
  
  // Feature 12: First security step execution order (normalized)
  const firstSecurityStep = securitySteps.length > 0
    ? Math.min(...securitySteps.map(s => s.executionOrder))
    : 0
  const normalizedFirstSecurityStep = totalStepCount > 0 ? firstSecurityStep / totalStepCount : 0
  
  // Feature 13: Last security step execution order (normalized)
  const lastSecurityStep = securitySteps.length > 0
    ? Math.max(...securitySteps.map(s => s.executionOrder))
    : 0
  const normalizedLastSecurityStep = totalStepCount > 0 ? lastSecurityStep / totalStepCount : 0
  
  // Feature 14: Steps with both secrets and write permissions
  const secretsWithWriteCount = steps.filter(step => 
    step.secrets === true && 
    step.permissions && step.permissions.includes('write')
  ).length
  
  // Feature 15: Steps with admin permissions
  const stepsWithAdminCount = adminPermissionCount
  
  // Feature 16: Security steps before deployment (if deploy steps exist)
  const deploySteps = steps.filter(step => step.type === 'deploy')
  const firstDeployOrder = deploySteps.length > 0
    ? Math.min(...deploySteps.map(s => s.executionOrder))
    : totalStepCount + 1
  const securityBeforeDeploy = securitySteps.filter(step => 
    step.executionOrder < firstDeployOrder
  ).length
  
  // Feature 17: Average execution order of all steps (normalized)
  const avgStepOrder = totalStepCount > 0
    ? steps.reduce((sum, step) => sum + step.executionOrder, 0) / totalStepCount
    : 0
  const normalizedAvgStepOrder = totalStepCount > 0 ? avgStepOrder / totalStepCount : 0
  
  // Build feature vector
  const features = [
    securityScanCount,              // 0: Security scan steps count
    securityStepCount,              // 1: Total security-related steps
    readPermissionCount,            // 2: Read permission count
    writePermissionCount,           // 3: Write permission count
    adminPermissionCount,           // 4: Admin permission count
    secretsUsageCount,              // 5: Secrets usage count
    approvalStepCount,              // 6: Manual approval steps count
    avgSecurityStepOrder,           // 7: Average execution order of security steps
    permissionEscalation,           // 8: Permission escalation indicator (0 or 1)
    totalStepCount,                 // 9: Total number of steps
    securityStepRatio,              // 10: Security steps ratio
    normalizedFirstSecurityStep,    // 11: First security step order (normalized)
    normalizedLastSecurityStep,     // 12: Last security step order (normalized)
    secretsWithWriteCount,          // 13: Steps with secrets and write permissions
    stepsWithAdminCount,            // 14: Steps with admin permissions
    securityBeforeDeploy,           // 15: Security steps before deployment
    normalizedAvgStepOrder,         // 16: Average step order (normalized)
  ]
  
  logger.debug(`Extracted ${features.length} features from ${totalStepCount} steps`)
  
  return features
}

/**
 * Normalize step name (helper function)
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
 * Detect permission escalation in steps
 * Permission escalation occurs when permissions increase from read -> write -> admin
 * @param {Array<Object>} steps - Array of parsed steps
 * @returns {boolean} True if permission escalation is detected
 */
function detectPermissionEscalation(steps) {
  if (steps.length < 2) {
    return false
  }
  
  // Get permission levels for each step (0 = none, 1 = read, 2 = write, 3 = admin)
  const permissionLevels = steps.map(step => {
    const perms = step.permissions || []
    if (perms.includes('admin')) return 3
    if (perms.includes('write')) return 2
    if (perms.includes('read')) return 1
    return 0
  })
  
  // Check if there's an increase in permission level
  for (let i = 1; i < permissionLevels.length; i++) {
    if (permissionLevels[i] > permissionLevels[i - 1]) {
      return true
    }
  }
  
  return false
}

/**
 * Get feature names (for explainability)
 * @returns {string[]} Array of feature names in order
 */
export function getFeatureNames() {
  return [
    'securityScanCount',
    'securityStepCount',
    'readPermissionCount',
    'writePermissionCount',
    'adminPermissionCount',
    'secretsUsageCount',
    'approvalStepCount',
    'avgSecurityStepOrder',
    'permissionEscalation',
    'totalStepCount',
    'securityStepRatio',
    'normalizedFirstSecurityStep',
    'normalizedLastSecurityStep',
    'secretsWithWriteCount',
    'stepsWithAdminCount',
    'securityBeforeDeploy',
    'normalizedAvgStepOrder',
  ]
}

/**
 * Get feature vector length
 * @returns {number} Number of features
 */
export function getFeatureCount() {
  return getFeatureNames().length
}

/**
 * Validate feature vector
 * @param {number[]} features - Feature vector
 * @returns {boolean} True if feature vector is valid
 */
export function validateFeatures(features) {
  if (!Array.isArray(features)) {
    return false
  }
  
  if (features.length !== getFeatureCount()) {
    return false
  }
  
  // Check all features are numbers
  return features.every(f => typeof f === 'number' && !isNaN(f) && isFinite(f))
}
