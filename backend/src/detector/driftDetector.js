/**
 * Drift Detector for comparing new runs against baseline and calculating drift scores
 * @module detector/driftDetector
 */

import { logger } from '../utils/logger.js'
import { getFeatureNames, validateFeatures, getFeatureCount } from '../features/featureExtractor.js'
import { loadModel, validateModel } from '../model/driftModel.js'
import { randomUUID } from 'crypto'

// Feature weights for drift score calculation
// Higher weights = more important for security
const FEATURE_WEIGHTS = {
  securityScanCount: 1.5,
  securityStepCount: 1.4,
  readPermissionCount: 0.8,
  writePermissionCount: 1.2,
  adminPermissionCount: 2.0,
  secretsUsageCount: 1.8,
  approvalStepCount: 1.3,
  avgSecurityStepOrder: 1.0,
  permissionEscalation: 2.5,
  totalStepCount: 0.5,
  securityStepRatio: 1.6,
  normalizedFirstSecurityStep: 1.1,
  normalizedLastSecurityStep: 1.1,
  secretsWithWriteCount: 2.2,
  stepsWithAdminCount: 2.0,
  securityBeforeDeploy: 1.7,
  normalizedAvgStepOrder: 0.9,
}

// Z-score thresholds
const Z_SCORE_THRESHOLDS = {
  NORMAL: 1.5,
  MINOR: 2.5,
  MODERATE: 3.5,
  MAJOR: 4.5,
}

// Risk level thresholds
const RISK_LEVEL_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 50,
  HIGH: 70,
  CRITICAL: 100,
}

/**
 * Calculate z-score for a feature value
 * @param {number} value - Feature value
 * @param {number} mean - Baseline mean
 * @param {number} stdDev - Baseline standard deviation
 * @returns {number} Z-score
 */
function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0 || stdDev < 0.1) {
    // Handle constant features (zero or near-zero std dev)
    if (Math.abs(value - mean) < 0.01) {
      return 0
    }
    // Use a small epsilon for division
    return (value - mean) / 0.1
  }
  return (value - mean) / stdDev
}

/**
 * Calculate drift score from z-scores
 * @param {Object} zScores - Object mapping feature names to z-scores
 * @returns {number} Drift score (0-100)
 */
function calculateDriftScore(zScores) {
  const featureNames = getFeatureNames()
  let weightedSum = 0
  let totalWeight = 0

  for (const featureName of featureNames) {
    const zScore = zScores[featureName] || 0
    const weight = FEATURE_WEIGHTS[featureName] || 1.0
    
    // Use absolute value of z-score
    const absZScore = Math.abs(zScore)
    weightedSum += absZScore * weight
    totalWeight += weight
  }

  if (totalWeight === 0) {
    return 0
  }

  // Average weighted z-score
  const avgWeightedZScore = weightedSum / totalWeight

  // Scale to 0-100 range
  // Using a scaling factor that maps typical z-scores to 0-100
  // Z-score of 2 ≈ 40, Z-score of 3 ≈ 60, Z-score of 4 ≈ 80, Z-score of 5+ ≈ 100
  const scalingFactor = 20 // Adjust this to calibrate the score
  let driftScore = avgWeightedZScore * scalingFactor

  // Cap at 100
  driftScore = Math.min(100, Math.max(0, driftScore))

  return Math.round(driftScore * 100) / 100 // Round to 2 decimal places
}

/**
 * Determine risk level from drift score
 * @param {number} driftScore - Drift score (0-100)
 * @returns {string} Risk level: 'low', 'medium', 'high', or 'critical'
 */
function calculateRiskLevel(driftScore) {
  if (driftScore <= RISK_LEVEL_THRESHOLDS.LOW) {
    return 'low'
  } else if (driftScore <= RISK_LEVEL_THRESHOLDS.MEDIUM) {
    return 'medium'
  } else if (driftScore <= RISK_LEVEL_THRESHOLDS.HIGH) {
    return 'high'
  } else {
    return 'critical'
  }
}

/**
 * Generate human-readable explanation for feature deviation
 * @param {string} featureName - Feature name
 * @param {number} zScore - Z-score
 * @param {number} currentValue - Current feature value
 * @param {number} baselineMean - Baseline mean value
 * @returns {string} Explanation
 */
function generateFeatureExplanation(featureName, zScore, currentValue, baselineMean) {
  const absZScore = Math.abs(zScore)
  const direction = zScore > 0 ? 'increased' : 'decreased'
  const magnitude = absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'slightly' :
                    absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'moderately' :
                    absZScore < Z_SCORE_THRESHOLDS.MAJOR ? 'significantly' : 'dramatically'

  const featureDescriptions = {
    securityScanCount: 'security scan steps',
    securityStepCount: 'security-related steps',
    readPermissionCount: 'read permission steps',
    writePermissionCount: 'write permission steps',
    adminPermissionCount: 'admin permission steps',
    secretsUsageCount: 'steps using secrets',
    approvalStepCount: 'manual approval steps',
    avgSecurityStepOrder: 'average execution order of security steps',
    permissionEscalation: 'permission escalation detected',
    totalStepCount: 'total pipeline steps',
    securityStepRatio: 'ratio of security steps',
    normalizedFirstSecurityStep: 'first security step position',
    normalizedLastSecurityStep: 'last security step position',
    secretsWithWriteCount: 'steps with secrets and write permissions',
    stepsWithAdminCount: 'steps with admin permissions',
    securityBeforeDeploy: 'security steps before deployment',
    normalizedAvgStepOrder: 'average step execution order',
  }

  const description = featureDescriptions[featureName] || featureName
  const change = Math.abs(currentValue - baselineMean)

  return `${description} ${direction} ${magnitude} (${currentValue.toFixed(2)} vs baseline ${baselineMean.toFixed(2)}, change: ${change.toFixed(2)})`
}

/**
 * Map feature deviations to security issue types
 * @param {string} featureName - Feature name
 * @param {number} zScore - Z-score
 * @param {number} currentValue - Current feature value
 * @param {number} baselineMean - Baseline mean value
 * @returns {Object|null} Security issue object or null
 */
function mapToSecurityIssue(featureName, zScore, currentValue, baselineMean) {
  const absZScore = Math.abs(zScore)
  
  // Only create issues for significant deviations
  if (absZScore < Z_SCORE_THRESHOLDS.NORMAL) {
    return null
  }

  const direction = zScore < 0 ? 'decreased' : 'increased'
  const isDecrease = direction === 'decreased'

  // Map features to security issue types
  const issueMappings = {
    securityScanCount: {
      type: 'security_scan_removed',
      condition: isDecrease,
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'low' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'medium' :
                absZScore < Z_SCORE_THRESHOLDS.MAJOR ? 'high' : 'critical',
      description: `Security scan steps ${direction} from ${baselineMean.toFixed(1)} to ${currentValue.toFixed(1)}`,
    },
    securityStepCount: {
      type: 'security_scan_removed',
      condition: isDecrease,
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'low' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'medium' :
                absZScore < Z_SCORE_THRESHOLDS.MAJOR ? 'high' : 'critical',
      description: `Security-related steps ${direction} from ${baselineMean.toFixed(1)} to ${currentValue.toFixed(1)}`,
    },
    adminPermissionCount: {
      type: 'permission_escalation',
      condition: !isDecrease, // Increase in admin permissions
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'medium' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'high' : 'critical',
      description: `Admin permission steps ${direction} from ${baselineMean.toFixed(1)} to ${currentValue.toFixed(1)}`,
    },
    permissionEscalation: {
      type: 'permission_escalation',
      condition: !isDecrease,
      severity: 'high',
      description: 'Permission escalation pattern detected in pipeline steps',
    },
    secretsUsageCount: {
      type: 'secrets_exposure',
      condition: true, // Any change in secrets usage is concerning
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'low' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'medium' :
                absZScore < Z_SCORE_THRESHOLDS.MAJOR ? 'high' : 'critical',
      description: `Secrets usage ${direction} from ${baselineMean.toFixed(1)} to ${currentValue.toFixed(1)}`,
    },
    secretsWithWriteCount: {
      type: 'secrets_exposure',
      condition: !isDecrease, // Increase is concerning
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'medium' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'high' : 'critical',
      description: `Steps with secrets and write permissions ${direction} from ${baselineMean.toFixed(1)} to ${currentValue.toFixed(1)}`,
    },
    approvalStepCount: {
      type: 'approval_bypassed',
      condition: isDecrease,
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'low' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'medium' :
                absZScore < Z_SCORE_THRESHOLDS.MAJOR ? 'high' : 'critical',
      description: `Manual approval steps ${direction} from ${baselineMean.toFixed(1)} to ${currentValue.toFixed(1)}`,
    },
    securityBeforeDeploy: {
      type: 'execution_order_changed',
      condition: isDecrease,
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'low' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'medium' : 'high',
      description: `Security steps before deployment ${direction} from ${baselineMean.toFixed(1)} to ${currentValue.toFixed(1)}`,
    },
    normalizedFirstSecurityStep: {
      type: 'execution_order_changed',
      condition: !isDecrease, // Later security steps are concerning
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'low' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'medium' : 'high',
      description: `First security step position changed (${currentValue.toFixed(3)} vs baseline ${baselineMean.toFixed(3)})`,
    },
    securityStepRatio: {
      type: 'security_scan_removed',
      condition: isDecrease,
      severity: absZScore < Z_SCORE_THRESHOLDS.MINOR ? 'low' :
                absZScore < Z_SCORE_THRESHOLDS.MODERATE ? 'medium' :
                absZScore < Z_SCORE_THRESHOLDS.MAJOR ? 'high' : 'critical',
      description: `Security step ratio ${direction} from ${baselineMean.toFixed(3)} to ${currentValue.toFixed(3)}`,
    },
  }

  const mapping = issueMappings[featureName]
  if (!mapping || !mapping.condition) {
    return null
  }

  return {
    id: randomUUID(),
    type: mapping.type,
    severity: mapping.severity,
    description: mapping.description,
    step: featureName,
  }
}

/**
 * Detect drift in a new pipeline run
 * @param {number[]} featureVector - Feature vector from new run
 * @param {Object} options - Detection options
 * @param {string} options.modelPath - Path to baseline model (optional)
 * @param {Object} options.model - Baseline model object (optional, overrides modelPath)
 * @param {string} options.pipelineName - Name of the pipeline (optional)
 * @returns {Object} Drift analysis result
 * @throws {Error} If feature vector or model is invalid
 */
export function detectDrift(featureVector, options = {}) {
  // Validate feature vector
  if (!validateFeatures(featureVector)) {
    throw new Error(`Invalid feature vector: expected ${getFeatureCount()} features`)
  }

  // Load model
  let model
  if (options.model) {
    model = options.model
  } else {
    const modelPath = options.modelPath || null
    try {
      model = loadModel(modelPath)
    } catch (error) {
      throw new Error(`Failed to load baseline model: ${error.message}`)
    }
  }

  // Validate model
  if (!validateModel(model)) {
    throw new Error('Invalid baseline model')
  }

  logger.info('Detecting drift against baseline model')

  const featureNames = getFeatureNames()
  const zScores = {}
  const explanations = []
  const securityIssues = []

  // Calculate z-scores for each feature
  for (let i = 0; i < featureNames.length; i++) {
    const featureName = featureNames[i]
    const currentValue = featureVector[i]
    const baselineFeature = model.features[featureName]

    if (!baselineFeature) {
      logger.warn(`Feature ${featureName} not found in baseline model, skipping`)
      continue
    }

    const mean = baselineFeature.mean
    const stdDev = baselineFeature.stdDev
    const zScore = calculateZScore(currentValue, mean, stdDev)
    zScores[featureName] = zScore

    // Generate explanation for significant deviations
    if (Math.abs(zScore) >= Z_SCORE_THRESHOLDS.NORMAL) {
      const explanation = generateFeatureExplanation(featureName, zScore, currentValue, mean)
      explanations.push(explanation)
      logger.debug(`Feature ${featureName}: z-score=${zScore.toFixed(2)}, ${explanation}`)
    }

    // Map to security issue
    const issue = mapToSecurityIssue(featureName, zScore, currentValue, mean)
    if (issue) {
      securityIssues.push(issue)
    }
  }

  // Calculate drift score
  const driftScore = calculateDriftScore(zScores)
  const riskLevel = calculateRiskLevel(driftScore)

  logger.info(`Drift detection complete: score=${driftScore.toFixed(2)}, risk=${riskLevel}, issues=${securityIssues.length}`)

  // Build result object
  const result = {
    id: randomUUID(),
    pipelineName: options.pipelineName || 'unknown',
    driftScore,
    riskLevel,
    timestamp: new Date().toISOString(),
    issues: securityIssues,
    explanations,
    zScores,
    featureVector,
  }

  return result
}

/**
 * Get feature weights (for debugging/inspection)
 * @returns {Object} Feature weights mapping
 */
export function getFeatureWeights() {
  return { ...FEATURE_WEIGHTS }
}

/**
 * Get z-score thresholds (for debugging/inspection)
 * @returns {Object} Z-score thresholds
 */
export function getZScoreThresholds() {
  return { ...Z_SCORE_THRESHOLDS }
}

/**
 * Get risk level thresholds (for debugging/inspection)
 * @returns {Object} Risk level thresholds
 */
export function getRiskLevelThresholds() {
  return { ...RISK_LEVEL_THRESHOLDS }
}
