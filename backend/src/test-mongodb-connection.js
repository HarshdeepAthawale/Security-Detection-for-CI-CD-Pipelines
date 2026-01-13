/**
 * Test MongoDB Atlas connection
 * @module test-mongodb-connection
 */

import 'dotenv/config'
import { connectDatabase, closeDatabase, isConnected } from './utils/database.js'
import { logger } from './utils/logger.js'

async function testConnection() {
  logger.info('='.repeat(60))
  logger.info('Testing MongoDB Atlas Connection')
  logger.info('='.repeat(60))

  try {
    // Test connection
    logger.info('\n1. Connecting to MongoDB Atlas...')
    await connectDatabase()
    
    if (isConnected()) {
      logger.info('✓ Successfully connected to MongoDB Atlas!')
    } else {
      throw new Error('Connection failed - isConnected() returned false')
    }

    // Test database operations
    logger.info('\n2. Testing database operations...')
    const { getDatabase } = await import('./utils/database.js')
    const db = getDatabase()
    
    // Test collection access
    const collection = db.collection('analyses')
    const count = await collection.countDocuments()
    logger.info(`✓ Database accessible - Current analyses count: ${count}`)

    // Test write operation
    logger.info('\n3. Testing write operation...')
    const testDoc = {
      id: 'test-connection-' + Date.now(),
      pipelineName: 'test-connection',
      driftScore: 0,
      riskLevel: 'low',
      timestamp: new Date().toISOString(),
      issues: [],
    }
    
    await collection.insertOne(testDoc)
    logger.info('✓ Write operation successful')

    // Test read operation
    logger.info('\n4. Testing read operation...')
    const retrieved = await collection.findOne({ id: testDoc.id })
    if (retrieved) {
      logger.info('✓ Read operation successful')
    } else {
      throw new Error('Failed to retrieve test document')
    }

    // Clean up test document
    await collection.deleteOne({ id: testDoc.id })
    logger.info('✓ Test document cleaned up')

    logger.info('\n' + '='.repeat(60))
    logger.info('✓ All MongoDB Atlas connection tests PASSED!')
    logger.info('='.repeat(60))

  } catch (error) {
    logger.error('\n✗ MongoDB Atlas connection test FAILED!')
    logger.error(`Error: ${error.message}`)
    logger.error('\nTroubleshooting:')
    logger.error('1. Check your MongoDB Atlas connection string in .env')
    logger.error('2. Verify your IP address is whitelisted in MongoDB Atlas')
    logger.error('3. Check your username and password are correct')
    logger.error('4. Ensure your cluster is running')
    process.exit(1)
  } finally {
    await closeDatabase()
    process.exit(0)
  }
}

// Run test
testConnection()
