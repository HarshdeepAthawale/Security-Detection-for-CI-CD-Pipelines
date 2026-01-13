/**
 * Express server for Security Detection for CI/CD Pipelines
 * @module server
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { logger } from './utils/logger.js'
import { connectDatabase, closeDatabase } from './utils/database.js'
import driftRoutes from './api/driftRoutes.js'

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
function createApp() {
  const app = express()

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }))
  
  // Request body parsing with size limits
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Request logging middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`)
    next()
  })

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'security-drift-backend',
    })
  })

  // API routes
  app.use('/api', driftRoutes)

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Security Detection for CI/CD Pipelines API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        analyze: 'POST /api/analyze',
        history: 'GET /api/history',
        train: 'POST /api/train',
      },
    })
  })

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    })
  })

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err)
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
  })

  return app
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    logger.info('Initializing database connection...')
    await connectDatabase()
    logger.info('Database connection established')
  } catch (error) {
    logger.error('Failed to connect to database:', error.message)
    logger.warn('Server will start but database operations may fail')
    logger.warn('Make sure MongoDB is running and MONGODB_URI is set correctly')
  }

  const PORT = process.env.PORT || 3001
  const app = createApp()

  const server = app.listen(PORT, () => {
    logger.info(`Security Detection for CI/CD Pipelines API server started`)
    logger.info(`Server running on http://localhost:${PORT}`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...')
    server.close(async () => {
      await closeDatabase()
      process.exit(0)
    })
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...')
    server.close(async () => {
      await closeDatabase()
      process.exit(0)
    })
  })

  return server
}

// Start server when this file is executed directly
startServer().catch(error => {
  logger.error('Failed to start server:', error)
  process.exit(1)
})

export { createApp, startServer }
