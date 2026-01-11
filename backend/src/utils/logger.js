/**
 * Simple logging utility for Security Detection for CI/CD Pipelines
 * @module utils/logger
 */

/**
 * Log levels
 * @enum {string}
 */
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
}

/**
 * Current log level (can be set via environment variable)
 */
const currentLogLevel = process.env.LOG_LEVEL || LogLevel.INFO

/**
 * Log level priority (higher number = higher priority)
 */
const logLevelPriority = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
}

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message) {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level}] ${message}`
}

/**
 * Check if message should be logged based on current log level
 * @param {string} level - Log level to check
 * @returns {boolean} True if message should be logged
 */
function shouldLog(level) {
  return logLevelPriority[level] >= logLevelPriority[currentLogLevel]
}

/**
 * Logger object with methods for different log levels
 */
export const logger = {
  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments to log
   */
  debug(message, ...args) {
    if (shouldLog(LogLevel.DEBUG)) {
      console.log(formatLogMessage(LogLevel.DEBUG, message), ...args)
    }
  },

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments to log
   */
  info(message, ...args) {
    if (shouldLog(LogLevel.INFO)) {
      console.log(formatLogMessage(LogLevel.INFO, message), ...args)
    }
  },

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments to log
   */
  warn(message, ...args) {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(formatLogMessage(LogLevel.WARN, message), ...args)
    }
  },

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments to log
   */
  error(message, ...args) {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(formatLogMessage(LogLevel.ERROR, message), ...args)
    }
  },
}
