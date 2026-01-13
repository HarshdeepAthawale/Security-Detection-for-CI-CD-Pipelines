/**
 * Drift Model for baseline learning and statistical baselining
 * @module model/driftModel
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'
import { getFeatureNames, validateFeatures, getFeatureCount } from '../features/featureExtractor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Default model directory (relative to backend directory)
const MODEL_DIR = join(__dirname, '..', '..', 'data', 'models')
const DEFAULT_MODEL_PATH = join(MODEL_DIR, 'baseline-model.json')

/**
 * Calculate mean of an array of numbers
 * @param {number[]} values - Array of numbers
 * @returns {number} Mean value
 */
function calculateMean(values) {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return sum / values.length
}

/**
 * Calculate standard deviation of an array of numbers
 * @param {number[]} values - Array of numbers
 * @param {number} mean - Mean value (optional, will calculate if not provided)
 * @returns {number} Standard deviation
 */
function calculateStdDev(values, mean = null) {
  if (values.length === 0) return 0
  if (values.length === 1) return 0.1 // Small non-zero value for single sample
  
  const calculatedMean = mean !== null ? mean : calculateMean(values)
  const squaredDiffs = values.map(val => Math.pow(val - calculatedMean, 2))
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Train a baseline model from feature vectors
 * @param {number[][]} featureVectors - Array of feature vectors from baseline runs
 * @param {Object} options - Training options
 * @param {string} options.pipelineName - Name of the pipeline (optional)
 * @returns {Object} Trained model object
 * @throws {Error} If feature vectors are invalid
 */
export function trainBaselineModel(featureVectors, options = {}) {
  if (!Array.isArray(featureVectors) || featureVectors.length === 0) {
    throw new Error('Feature vectors array must be non-empty')
  }

  // Validate all feature vectors
  const featureCount = getFeatureCount()
  for (let i = 0; i < featureVectors.length; i++) {
    if (!validateFeatures(featureVectors[i])) {
      throw new Error(`Invalid feature vector at index ${i}: expected ${featureCount} features`)
    }
  }

  logger.info(`Training baseline model from ${featureVectors.length} feature vectors`)

  // Get feature names
  const featureNames = getFeatureNames()

  // Calculate statistics for each feature
  const features = {}
  
  for (let i = 0; i < featureCount; i++) {
    const featureName = featureNames[i]
    const values = featureVectors.map(vector => vector[i])
    
    const mean = calculateMean(values)
    const stdDev = calculateStdDev(values, mean)
    
    // Handle edge case: zero standard deviation (constant feature)
    // Use a small epsilon to avoid division by zero
    const adjustedStdDev = stdDev === 0 ? 0.1 : stdDev
    
    features[featureName] = {
      mean,
      stdDev: adjustedStdDev,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    }
    
    logger.debug(`Feature ${featureName}: mean=${mean.toFixed(4)}, stdDev=${adjustedStdDev.toFixed(4)}`)
  }

  // Build model object
  const model = {
    features,
    trainedAt: new Date().toISOString(),
    baselineRunCount: featureVectors.length,
    pipelineName: options.pipelineName || 'default',
    version: '1.0.0',
  }

  logger.info(`Baseline model trained successfully with ${featureVectors.length} runs`)
  
  return model
}

/**
 * Save model to JSON file
 * @param {Object} model - Trained model object
 * @param {string} filePath - Path to save model (optional, defaults to baseline-model.json)
 * @throws {Error} If model is invalid or save fails
 */
export function saveModel(model, filePath = DEFAULT_MODEL_PATH) {
  if (!model || !model.features) {
    throw new Error('Invalid model: features are required')
  }

  // Ensure model directory exists
  const modelDir = dirname(filePath)
  if (!existsSync(modelDir)) {
    throw new Error(`Model directory does not exist: ${modelDir}`)
  }

  try {
    const modelJson = JSON.stringify(model, null, 2)
    writeFileSync(filePath, modelJson, 'utf-8')
    logger.info(`Model saved to ${filePath}`)
  } catch (error) {
    logger.error(`Failed to save model: ${error.message}`)
    throw new Error(`Failed to save model: ${error.message}`)
  }
}

/**
 * Load model from JSON file
 * @param {string} filePath - Path to model file (optional, defaults to baseline-model.json)
 * @returns {Object} Loaded model object
 * @throws {Error} If model file doesn't exist or is invalid
 */
export function loadModel(filePath = DEFAULT_MODEL_PATH) {
  if (!existsSync(filePath)) {
    throw new Error(`Model file does not exist: ${filePath}`)
  }

  try {
    const modelJson = readFileSync(filePath, 'utf-8')
    const model = JSON.parse(modelJson)
    
    // Validate model structure
    if (!model.features || typeof model.features !== 'object') {
      throw new Error('Invalid model: features object is required')
    }

    logger.info(`Model loaded from ${filePath}`)
    logger.debug(`Model trained at: ${model.trainedAt}, baseline runs: ${model.baselineRunCount}`)
    
    return model
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Model file not found: ${filePath}`)
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in model file: ${error.message}`)
    }
    logger.error(`Failed to load model: ${error.message}`)
    throw new Error(`Failed to load model: ${error.message}`)
  }
}

/**
 * Retrain model by adding new baseline runs
 * Combines existing model data with new feature vectors
 * @param {Object} existingModel - Existing model object
 * @param {number[][]} newFeatureVectors - Array of new feature vectors to add
 * @param {Object} options - Retraining options
 * @returns {Object} Updated model object
 * @throws {Error} If inputs are invalid
 */
export function retrainModel(existingModel, newFeatureVectors, options = {}) {
  if (!existingModel || !existingModel.features) {
    throw new Error('Invalid existing model')
  }

  if (!Array.isArray(newFeatureVectors) || newFeatureVectors.length === 0) {
    throw new Error('New feature vectors array must be non-empty')
  }

  logger.info(`Retraining model with ${newFeatureVectors.length} new feature vectors`)

  const featureNames = getFeatureNames()
  const featureCount = getFeatureCount()

  // Validate new feature vectors
  for (let i = 0; i < newFeatureVectors.length; i++) {
    if (!validateFeatures(newFeatureVectors[i])) {
      throw new Error(`Invalid feature vector at index ${i}`)
    }
  }

  // Combine existing and new data for each feature
  const updatedFeatures = {}
  
  for (let i = 0; i < featureCount; i++) {
    const featureName = featureNames[i]
    const existingFeature = existingModel.features[featureName]
    
    if (!existingFeature) {
      logger.warn(`Feature ${featureName} not found in existing model, initializing from new data`)
      // Initialize from new data only
      const newValues = newFeatureVectors.map(vector => vector[i])
      const mean = calculateMean(newValues)
      const stdDev = calculateStdDev(newValues, mean)
      const adjustedStdDev = stdDev === 0 ? 0.1 : stdDev
      
      updatedFeatures[featureName] = {
        mean,
        stdDev: adjustedStdDev,
        count: newValues.length,
        min: Math.min(...newValues),
        max: Math.max(...newValues),
      }
    } else {
      // Combine existing and new values
      const existingCount = existingFeature.count || 0
      const existingMean = existingFeature.mean || 0
      const newValues = newFeatureVectors.map(vector => vector[i])
      
      // Calculate combined mean: (old_mean * old_count + new_mean * new_count) / total_count
      const newMean = calculateMean(newValues)
      const totalCount = existingCount + newValues.length
      const combinedMean = (existingMean * existingCount + newMean * newValues.length) / totalCount
      
      // For standard deviation, we need all values to recalculate accurately
      // Since we don't have all original values, we use a weighted approximation
      // This is less accurate but practical for incremental updates
      const existingStdDev = existingFeature.stdDev || 0.1
      const newStdDev = calculateStdDev(newValues, newMean)
      
      // Weighted combination of standard deviations (approximation)
      // More accurate would require storing all values, but that's memory-intensive
      const combinedStdDev = Math.sqrt(
        (existingStdDev * existingStdDev * existingCount + 
         newStdDev * newStdDev * newValues.length) / totalCount
      )
      
      const adjustedStdDev = combinedStdDev === 0 ? 0.1 : combinedStdDev
      
      updatedFeatures[featureName] = {
        mean: combinedMean,
        stdDev: adjustedStdDev,
        count: totalCount,
        min: Math.min(existingFeature.min || Infinity, ...newValues),
        max: Math.max(existingFeature.max || -Infinity, ...newValues),
      }
    }
  }

  // Build updated model
  const updatedModel = {
    ...existingModel,
    features: updatedFeatures,
    trainedAt: new Date().toISOString(),
    baselineRunCount: (existingModel.baselineRunCount || 0) + newFeatureVectors.length,
    lastRetrainedAt: new Date().toISOString(),
  }

  logger.info(`Model retrained successfully. Total baseline runs: ${updatedModel.baselineRunCount}`)
  
  return updatedModel
}

/**
 * Validate model structure
 * @param {Object} model - Model object to validate
 * @returns {boolean} True if model is valid
 */
export function validateModel(model) {
  if (!model || typeof model !== 'object') {
    return false
  }

  if (!model.features || typeof model.features !== 'object') {
    return false
  }

  const featureNames = getFeatureNames()
  
  // Check that all expected features exist
  for (const featureName of featureNames) {
    const feature = model.features[featureName]
    if (!feature) {
      logger.warn(`Missing feature in model: ${featureName}`)
      return false
    }
    
    if (typeof feature.mean !== 'number' || typeof feature.stdDev !== 'number') {
      logger.warn(`Invalid feature statistics for ${featureName}`)
      return false
    }
    
    if (feature.stdDev < 0) {
      logger.warn(`Negative standard deviation for ${featureName}`)
      return false
    }
  }

  return true
}

/**
 * Get model statistics
 * @param {Object} model - Model object
 * @returns {Object} Model statistics
 */
export function getModelStats(model) {
  if (!validateModel(model)) {
    throw new Error('Invalid model')
  }

  const featureNames = getFeatureNames()
  const stats = {
    trainedAt: model.trainedAt,
    baselineRunCount: model.baselineRunCount,
    featureCount: featureNames.length,
    features: {},
  }

  for (const featureName of featureNames) {
    const feature = model.features[featureName]
    stats.features[featureName] = {
      mean: feature.mean,
      stdDev: feature.stdDev,
      range: {
        min: feature.min,
        max: feature.max,
      },
    }
  }

  return stats
}
