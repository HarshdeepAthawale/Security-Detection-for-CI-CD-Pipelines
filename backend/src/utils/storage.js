/**
 * MongoDB storage for analysis history
 * @module utils/storage
 */

import { logger } from './logger.js'
import { getDatabase } from './database.js'

const COLLECTION_NAME = 'analyses'

/**
 * Get analyses collection
 * @returns {Object} MongoDB collection
 */
function getCollection() {
  const db = getDatabase()
  return db.collection(COLLECTION_NAME)
}

/**
 * Store a drift analysis result
 * @param {Object} analysis - DriftAnalysis object
 * @returns {Promise<Object>} Stored analysis with id
 */
export async function storeAnalysis(analysis) {
  if (!analysis || !analysis.id) {
    throw new Error('Invalid analysis: id is required')
  }

  try {
    const collection = getCollection()
    
    // Check if analysis with this ID already exists
    const existing = await collection.findOne({ id: analysis.id })
    
    if (existing) {
      // Update existing analysis
      await collection.updateOne(
        { id: analysis.id },
        { $set: analysis }
      )
      logger.debug(`Updated analysis: ${analysis.id} for pipeline ${analysis.pipelineName}`)
    } else {
      // Insert new analysis
      await collection.insertOne(analysis)
      logger.debug(`Stored analysis: ${analysis.id} for pipeline ${analysis.pipelineName}`)
    }
    
    return analysis
  } catch (error) {
    logger.error(`Failed to store analysis: ${error.message}`)
    throw new Error(`Failed to store analysis: ${error.message}`)
  }
}

/**
 * Get analysis history with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.pipeline - Filter by pipeline name
 * @param {number} filters.limit - Maximum number of results
 * @param {string} filters.since - ISO timestamp filter (only return analyses after this time)
 * @returns {Promise<Object[]>} Array of DriftAnalysis objects
 */
export async function getAnalysisHistory(filters = {}) {
  try {
    const collection = getCollection()
    
    // Build query
    const query = {}
    
    // Filter by pipeline
    if (filters.pipeline) {
      query.pipelineName = filters.pipeline
    }
    
    // Filter by timestamp
    if (filters.since) {
      query.timestamp = { $gte: filters.since }
    }
    
    // Build options
    const options = {
      sort: { timestamp: -1 }, // Newest first
    }
    
    // Apply limit
    if (filters.limit && filters.limit > 0) {
      options.limit = Math.min(filters.limit, 1000) // Cap at 1000
    }
    
    // Execute query
    const results = await collection.find(query, options).toArray()
    
    logger.debug(`Retrieved ${results.length} analyses from database`)
    
    return results
  } catch (error) {
    logger.error(`Failed to get analysis history: ${error.message}`)
    throw new Error(`Failed to get analysis history: ${error.message}`)
  }
}

/**
 * Get analysis by ID
 * @param {string} id - Analysis ID
 * @returns {Promise<Object|null>} DriftAnalysis object or null if not found
 */
export async function getAnalysisById(id) {
  try {
    const collection = getCollection()
    const analysis = await collection.findOne({ id })
    return analysis || null
  } catch (error) {
    logger.error(`Failed to get analysis by ID: ${error.message}`)
    throw new Error(`Failed to get analysis by ID: ${error.message}`)
  }
}

/**
 * Get statistics about stored analyses
 * @param {Object} options - Filter options
 * @param {boolean} options.excludeTestData - Exclude test/sample pipelines (default: false in dev, true in production)
 * @returns {Promise<Object>} Statistics object
 */
export async function getStatistics(options = {}) {
  try {
    const collection = getCollection()
    
    // Build query - exclude test data in production
    const query = {}
    const excludeTestData = options.excludeTestData !== undefined 
      ? options.excludeTestData 
      : process.env.NODE_ENV === 'production'
    
    if (excludeTestData) {
      query.pipelineName = {
        $not: {
          $regex: /test|sample|mock|dummy/i
        }
      }
    }
    
    // Get total count
    const totalAnalyses = await collection.countDocuments(query)
    
    if (totalAnalyses === 0) {
      return {
        totalAnalyses: 0,
        averageScore: 0,
        criticalIssues: 0,
        lastAnalysis: null,
      }
    }
    
    // Calculate average score using aggregation with query filter
    const avgResult = await collection.aggregate([
      ...(Object.keys(query).length > 0 ? [{ $match: query }] : []),
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$driftScore' },
        },
      },
    ]).toArray()
    
    const averageScore = avgResult.length > 0 && avgResult[0].avgScore
      ? Math.round(avgResult[0].avgScore * 100) / 100
      : 0
    
    // Count critical issues using aggregation with query filter
    const criticalIssuesPipeline = []
    if (Object.keys(query).length > 0) {
      criticalIssuesPipeline.push({ $match: query })
    }
    criticalIssuesPipeline.push(
      {
        $unwind: '$issues',
      },
      {
        $match: {
          'issues.severity': { $in: ['critical', 'high'] },
        },
      },
      {
        $count: 'count',
      }
    )
    const criticalIssuesResult = await collection.aggregate(criticalIssuesPipeline).toArray()
    
    const criticalIssues = criticalIssuesResult.length > 0 && criticalIssuesResult[0].count
      ? criticalIssuesResult[0].count
      : 0
    
    // Get most recent analysis timestamp (with query filter)
    const lastAnalysisDoc = await collection
      .findOne(query, { sort: { timestamp: -1 }, projection: { timestamp: 1 } })
    
    const lastAnalysis = lastAnalysisDoc ? lastAnalysisDoc.timestamp : null
    
    return {
      totalAnalyses,
      averageScore,
      criticalIssues,
      lastAnalysis,
    }
  } catch (error) {
    logger.error(`Failed to get statistics: ${error.message}`)
    // Return default stats on error
    return {
      totalAnalyses: 0,
      averageScore: 0,
      criticalIssues: 0,
      lastAnalysis: null,
    }
  }
}

/**
 * Clear all stored analyses (useful for testing)
 * @returns {Promise<number>} Number of deleted documents
 */
export async function clearHistory() {
  try {
    const collection = getCollection()
    const result = await collection.deleteMany({})
    logger.info(`Cleared ${result.deletedCount} analyses from database`)
    return result.deletedCount
  } catch (error) {
    logger.error(`Failed to clear history: ${error.message}`)
    throw new Error(`Failed to clear history: ${error.message}`)
  }
}

/**
 * Get all analyses (for debugging)
 * @returns {Promise<Object[]>} All stored analyses
 */
export async function getAllAnalyses() {
  try {
    const collection = getCollection()
    return await collection.find({}).sort({ timestamp: -1 }).toArray()
  } catch (error) {
    logger.error(`Failed to get all analyses: ${error.message}`)
    throw new Error(`Failed to get all analyses: ${error.message}`)
  }
}

/**
 * Delete analysis by ID
 * @param {string} id - Analysis ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteAnalysis(id) {
  try {
    const collection = getCollection()
    const result = await collection.deleteOne({ id })
    return result.deletedCount > 0
  } catch (error) {
    logger.error(`Failed to delete analysis: ${error.message}`)
    throw new Error(`Failed to delete analysis: ${error.message}`)
  }
}

/**
 * Get analyses by pipeline name
 * @param {string} pipelineName - Pipeline name
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Object[]>} Array of analyses
 */
export async function getAnalysesByPipeline(pipelineName, limit = 100) {
  try {
    const collection = getCollection()
    return await collection
      .find({ pipelineName })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    logger.error(`Failed to get analyses by pipeline: ${error.message}`)
    throw new Error(`Failed to get analyses by pipeline: ${error.message}`)
  }
}
