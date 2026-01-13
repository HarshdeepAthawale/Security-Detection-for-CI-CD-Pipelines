/**
 * ML Service client for communicating with Python ML service
 * @module utils/mlService
 */

import { logger } from './logger.js'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000'
const ML_SERVICE_TIMEOUT = parseInt(process.env.ML_SERVICE_TIMEOUT || '5000', 10)
const ML_SERVICE_RETRY_ATTEMPTS = parseInt(process.env.ML_SERVICE_RETRY_ATTEMPTS || '3', 10)

/**
 * Create a timeout promise
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that rejects after timeout
 */
function createTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
  })
}

/**
 * Make HTTP request with timeout and retry logic
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(url, options = {}, retries = ML_SERVICE_RETRY_ATTEMPTS) {
  const fetchPromise = fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  try {
    const response = await Promise.race([
      fetchPromise,
      createTimeout(ML_SERVICE_TIMEOUT),
    ])
    return response
  } catch (error) {
    if (retries > 0 && (error.message.includes('timeout') || error.message.includes('ECONNREFUSED'))) {
      logger.warn(`ML service request failed, retrying... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

/**
 * Check if ML service is healthy
 * @returns {Promise<boolean>} True if service is healthy
 */
export async function checkMLServiceHealth() {
  try {
    const response = await fetchWithRetry(`${ML_SERVICE_URL}/health`, {
      method: 'GET',
    }, 1) // Only 1 retry for health check

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.status === 'healthy'
  } catch (error) {
    logger.debug(`ML service health check failed: ${error.message}`)
    return false
  }
}

/**
 * Predict drift score from feature vector
 * @param {number[]} featureVector - Feature vector (17 features)
 * @returns {Promise<Object>} Prediction result with drift_score, risk_level, etc.
 * @throws {Error} If prediction fails
 */
export async function predictDrift(featureVector) {
  if (!Array.isArray(featureVector)) {
    throw new Error('Feature vector must be an array')
  }

  if (featureVector.length !== 17) {
    throw new Error(`Expected 17 features, got ${featureVector.length}`)
  }

  try {
    logger.debug(`Calling ML service for prediction: ${ML_SERVICE_URL}/predict`)

    const response = await fetchWithRetry(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      body: JSON.stringify({ features: featureVector }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
      throw new Error(`ML service error: ${errorData.detail || response.statusText}`)
    }

    const result = await response.json()
    logger.debug(`ML service prediction: drift_score=${result.drift_score}, risk_level=${result.risk_level}`)

    return result
  } catch (error) {
    logger.error(`ML service prediction failed: ${error.message}`)
    throw new Error(`ML service unavailable: ${error.message}`)
  }
}

/**
 * Train ML model from baseline feature vectors
 * @param {number[][]} featureVectors - Array of feature vectors
 * @returns {Promise<Object>} Training result
 * @throws {Error} If training fails
 */
export async function trainModel(featureVectors) {
  if (!Array.isArray(featureVectors) || featureVectors.length < 2) {
    throw new Error('At least 2 feature vectors are required for training')
  }

  try {
    logger.info(`Training ML model with ${featureVectors.length} feature vectors`)

    const response = await fetchWithRetry(`${ML_SERVICE_URL}/train`, {
      method: 'POST',
      body: JSON.stringify({ feature_vectors: featureVectors }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
      throw new Error(`ML service training error: ${errorData.detail || response.statusText}`)
    }

    const result = await response.json()
    logger.info(`ML model trained successfully: ${result.model_version}, runs=${result.baseline_run_count}`)

    return result
  } catch (error) {
    logger.error(`ML service training failed: ${error.message}`)
    throw new Error(`ML service training failed: ${error.message}`)
  }
}

/**
 * Get model information
 * @returns {Promise<Object>} Model metadata
 * @throws {Error} If request fails
 */
export async function getModelInfo() {
  try {
    const response = await fetchWithRetry(`${ML_SERVICE_URL}/model/info`, {
      method: 'GET',
    }, 1) // Only 1 retry for info

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
      throw new Error(`ML service error: ${errorData.detail || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    logger.debug(`ML service model info failed: ${error.message}`)
    throw new Error(`ML service unavailable: ${error.message}`)
  }
}
