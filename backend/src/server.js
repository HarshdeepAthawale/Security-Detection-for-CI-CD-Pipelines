/**
 * Express server for Security Detection for CI/CD Pipelines
 * @module server
 */

import express from 'express'
import cors from 'cors'
import { logger } from './utils/logger.js'

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
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

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

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Security Detection for CI/CD Pipelines API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        // API routes will be added in Phase 4
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
function startServer() {
  const PORT = process.env.PORT || 3001
  const app = createApp()

  app.listen(PORT, () => {
    logger.info(`Security Detection for CI/CD Pipelines API server started`)
    logger.info(`Server running on http://localhost:${PORT}`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

// Start server when this file is executed directly
startServer()

export { createApp, startServer }
