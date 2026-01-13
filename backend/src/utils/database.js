/**
 * MongoDB database connection and utilities
 * @module utils/database
 */

import { MongoClient } from 'mongodb'
import { logger } from './logger.js'

let client = null
let db = null

/**
 * Get MongoDB connection string and database name from environment
 * @returns {Object} Object with connectionString and dbName
 */
function getConnectionConfig() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
  const dbName = process.env.MONGODB_DB_NAME || 'security-drift'
  
  // Check if URI already contains database name
  // Format: mongodb://host:port/dbname or mongodb+srv://host/dbname
  const uriParts = mongoUri.split('/')
  
  // Check if there's a database name in the path (before query parameters)
  if (uriParts.length > 3) {
    const lastPart = uriParts[uriParts.length - 1]
    // Extract database name (before query parameters)
    const dbNameFromUri = lastPart.split('?')[0]
    
    // If last part is not empty and not just query params, it's a database name
    if (dbNameFromUri && dbNameFromUri.length > 0 && !dbNameFromUri.includes('@')) {
      return {
        connectionString: mongoUri,
        dbName: dbNameFromUri,
      }
    }
  }
  
  // Append database name if not present
  // Handle both cases: with and without query parameters
  if (mongoUri.includes('?')) {
    // Insert database name before query parameters
    const [baseUri, queryString] = mongoUri.split('?')
    const separator = baseUri.endsWith('/') ? '' : '/'
    return {
      connectionString: `${baseUri}${separator}${dbName}?${queryString}`,
      dbName,
    }
  } else {
    // No query parameters, append normally
    const separator = mongoUri.endsWith('/') ? '' : '/'
    return {
      connectionString: `${mongoUri}${separator}${dbName}`,
      dbName,
    }
  }
}

/**
 * Connect to MongoDB database
 * @returns {Promise<MongoClient>} MongoDB client
 */
export async function connectDatabase() {
  if (client && db) {
    logger.debug('Database already connected')
    return { client, db }
  }

  try {
    const { connectionString, dbName } = getConnectionConfig()
    
    // Mask credentials in log
    const maskedUri = connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    logger.info(`Connecting to MongoDB: ${maskedUri}`)
    
    client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    
    db = client.db(dbName)
    
    logger.info(`Connected to MongoDB database: ${dbName}`)
    
    // Create indexes for better query performance
    await createIndexes()
    
    return { client, db }
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error)
    throw new Error(`Database connection failed: ${error.message}`)
  }
}

/**
 * Create database indexes for better query performance
 */
async function createIndexes() {
  if (!db) {
    return
  }

  try {
    const analysesCollection = db.collection('analyses')
    
    // Create indexes
    await analysesCollection.createIndex({ timestamp: -1 }) // Descending for newest first
    await analysesCollection.createIndex({ pipelineName: 1 })
    await analysesCollection.createIndex({ id: 1 }, { unique: true })
    await analysesCollection.createIndex({ 'pipelineName': 1, 'timestamp': -1 })
    
    logger.debug('Database indexes created')
  } catch (error) {
    logger.warn('Failed to create indexes (may already exist):', error.message)
  }
}

/**
 * Get database instance
 * @returns {Object} MongoDB database instance
 * @throws {Error} If database is not connected
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.')
  }
  return db
}

/**
 * Get MongoDB client
 * @returns {MongoClient} MongoDB client
 */
export function getClient() {
  return client
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  if (client) {
    await client.close()
    client = null
    db = null
    logger.info('Database connection closed')
  }
}

/**
 * Check if database is connected
 * @returns {boolean} True if connected
 */
export function isConnected() {
  return client !== null && db !== null
}
