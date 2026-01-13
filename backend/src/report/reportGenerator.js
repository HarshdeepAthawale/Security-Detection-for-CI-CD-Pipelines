/**
 * Report generator for formatting detection results into dashboard-ready data
 * @module report/reportGenerator
 */

import { logger } from '../utils/logger.js'

/**
 * Map issue type to human-readable description
 * @param {string} issueType - Issue type
 * @returns {string} Human-readable description
 */
function formatIssueType(issueType) {
  const issueTypeMap = {
    security_scan_removed: 'Security scan step removed from pipeline',
    permission_escalation: 'Pipeline permissions escalated (read → write/admin)',
    secrets_exposure: 'Secrets usage pattern changed or exposed in logs',
    approval_bypassed: 'Manual approval step removed or bypassed',
    execution_order_changed: 'Security-critical step execution order changed',
  }

  return issueTypeMap[issueType] || issueType
}

/**
 * Format security issue for display
 * @param {Object} issue - SecurityIssue object
 * @returns {Object} Formatted security issue
 */
export function formatSecurityIssue(issue) {
  return {
    id: issue.id,
    type: issue.type,
    severity: issue.severity,
    description: issue.description || formatIssueType(issue.type),
    step: issue.step,
    formattedType: formatIssueType(issue.type),
  }
}

/**
 * Format multiple security issues
 * @param {Object[]} issues - Array of SecurityIssue objects
 * @returns {Object[]} Array of formatted security issues
 */
export function formatSecurityIssues(issues) {
  if (!Array.isArray(issues)) {
    return []
  }

  return issues.map(issue => formatSecurityIssue(issue))
}

/**
 * Create timeline data point from analysis
 * @param {Object} analysis - DriftAnalysis object
 * @returns {Object} TimelineDataPoint object
 */
export function createTimelineDataPoint(analysis) {
  if (!analysis || !analysis.timestamp || typeof analysis.driftScore !== 'number') {
    logger.warn('Invalid analysis for timeline data point')
    return null
  }

  // Generate event description for significant changes
  let event = null
  if (analysis.driftScore >= 70) {
    event = 'Critical security drift detected'
  } else if (analysis.driftScore >= 50) {
    event = 'High security drift detected'
  } else if (analysis.issues && analysis.issues.length > 0) {
    const criticalIssues = analysis.issues.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    )
    if (criticalIssues.length > 0) {
      event = `${criticalIssues.length} critical issue(s) detected`
    }
  }

  return {
    date: analysis.timestamp,
    score: analysis.driftScore,
    event,
  }
}

/**
 * Create timeline data points from analysis history
 * @param {Object[]} history - Array of DriftAnalysis objects
 * @returns {Object[]} Array of TimelineDataPoint objects, sorted by date
 */
export function createTimelineData(history) {
  if (!Array.isArray(history)) {
    return []
  }

  const timelineData = history
    .map(analysis => createTimelineDataPoint(analysis))
    .filter(point => point !== null)
    .sort((a, b) => {
      // Sort chronologically (oldest first)
      return new Date(a.date) - new Date(b.date)
    })

  logger.debug(`Created ${timelineData.length} timeline data points from ${history.length} analyses`)

  return timelineData
}

/**
 * Compare baseline and current pipeline steps
 * @param {Object[]} baselineSteps - Array of parsed steps from baseline
 * @param {Object[]} currentSteps - Array of parsed steps from current run
 * @returns {Object} Comparison result with baseline and current pipeline steps
 */
export function generatePipelineComparison(baselineSteps = [], currentSteps = []) {
  // Create maps for quick lookup
  const baselineMap = new Map()
  baselineSteps.forEach(step => {
    baselineMap.set(step.name, step)
  })

  const currentMap = new Map()
  currentSteps.forEach(step => {
    currentMap.set(step.name, step)
  })

  // Find all unique step names
  const allStepNames = new Set([
    ...baselineSteps.map(s => s.name),
    ...currentSteps.map(s => s.name),
  ])

  // Generate comparison arrays
  const baselinePipeline = []
  const currentPipeline = []

  allStepNames.forEach(stepName => {
    const baselineStep = baselineMap.get(stepName)
    const currentStep = currentMap.get(stepName)

    // Handle baseline steps
    if (baselineStep) {
      if (currentStep) {
        // Step exists in both - check if modified
        const permissionsChanged = JSON.stringify(baselineStep.permissions || []) !== 
                                   JSON.stringify(currentStep.permissions || [])
        const securityChanged = (baselineStep.security || false) !== (currentStep.security || false)
        const secretsChanged = (baselineStep.secrets || false) !== (currentStep.secrets || false)
        const approvalChanged = (baselineStep.approval || false) !== (currentStep.approval || false)
        
        const isModified = permissionsChanged || securityChanged || secretsChanged || approvalChanged
        
        baselinePipeline.push({
          name: stepName,
          status: isModified ? 'unchanged' : 'unchanged', // Baseline shows unchanged even if modified
          security: baselineStep.security || false,
        })
      } else {
        // Step exists in baseline but not in current - REMOVED
        baselinePipeline.push({
          name: stepName,
          status: 'removed',
          security: baselineStep.security || false,
        })
      }
    }

    // Handle current steps
    if (currentStep) {
      if (baselineStep) {
        // Step exists in both - check if modified
        const permissionsChanged = JSON.stringify(baselineStep.permissions || []) !== 
                                   JSON.stringify(currentStep.permissions || [])
        const securityChanged = (baselineStep.security || false) !== (currentStep.security || false)
        const secretsChanged = (baselineStep.secrets || false) !== (currentStep.secrets || false)
        const approvalChanged = (baselineStep.approval || false) !== (currentStep.approval || false)
        
        const isModified = permissionsChanged || securityChanged || secretsChanged || approvalChanged
        
        currentPipeline.push({
          name: stepName,
          status: isModified ? 'modified' : 'unchanged',
          security: currentStep.security || false,
        })
      } else {
        // Step exists in current but not in baseline - ADDED
        currentPipeline.push({
          name: stepName,
          status: 'added',
          security: currentStep.security || false,
        })
      }
    }
    // Note: We don't add removed steps to currentPipeline - they only appear in baseline
  })

  // Sort both arrays to maintain consistent order (by name)
  baselinePipeline.sort((a, b) => a.name.localeCompare(b.name))
  currentPipeline.sort((a, b) => a.name.localeCompare(b.name))

  return {
    baseline: baselinePipeline,
    current: currentPipeline,
  }
}

/**
 * Generate quick stats for dashboard
 * @param {Object[]} history - Array of DriftAnalysis objects
 * @param {Object} stats - Statistics object from storage
 * @returns {Object[]} Array of QuickStat objects
 */
export function generateQuickStats(history = [], stats = {}) {
  const totalAnalyses = stats.totalAnalyses || history.length
  const averageScore = stats.averageScore || 0
  const criticalIssues = stats.criticalIssues || 0
  const lastAnalysis = stats.lastAnalysis

  // Calculate additional stats
  const recentAnalyses = history.slice(0, 10)
  const recentAverage = recentAnalyses.length > 0
    ? recentAnalyses.reduce((sum, a) => sum + a.driftScore, 0) / recentAnalyses.length
    : 0

  const previousAverage = history.length > 10
    ? history.slice(10, 20).reduce((sum, a) => sum + a.driftScore, 0) / 10
    : 0

  const scoreChange = recentAverage - previousAverage
  const scoreChangeType = scoreChange > 5 ? 'negative' : 
                         scoreChange < -5 ? 'positive' : 'neutral'

  // Format last analysis timestamp
  let lastAnalysisFormatted = 'Never'
  if (lastAnalysis) {
    try {
      const date = new Date(lastAnalysis)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) {
        lastAnalysisFormatted = 'Just now'
      } else if (diffMins < 60) {
        lastAnalysisFormatted = `${diffMins}m ago`
      } else if (diffHours < 24) {
        lastAnalysisFormatted = `${diffHours}h ago`
      } else {
        lastAnalysisFormatted = `${diffDays}d ago`
      }
    } catch (error) {
      logger.warn('Failed to format last analysis timestamp:', error)
    }
  }

  return [
    {
      label: 'Total Analyses',
      value: totalAnalyses.toString(),
      icon: 'pipelines',
      change: '',
      changeType: 'neutral',
    },
    {
      label: 'Average Score',
      value: averageScore.toFixed(1),
      icon: 'healthy',
      change: scoreChange !== 0 
        ? `${scoreChange > 0 ? '+' : ''}${scoreChange.toFixed(1)}`
        : '0.0',
      changeType: scoreChangeType,
    },
    {
      label: 'Critical Issues',
      value: criticalIssues.toString(),
      icon: 'alerts',
      change: '',
      changeType: 'neutral',
    },
    {
      label: 'Last Analysis',
      value: lastAnalysisFormatted,
      icon: 'clock',
      change: '',
      changeType: 'neutral',
    },
  ]
}

/**
 * Calculate score trend from analysis history
 * @param {Object} currentAnalysis - Current DriftAnalysis
 * @param {Object[]} history - Analysis history for the same pipeline
 * @returns {Object|null} Trend object with change and direction, or null if no previous data
 */
function calculateScoreTrend(currentAnalysis, history = []) {
  if (!currentAnalysis || !history || history.length < 2) {
    return null
  }

  // Find previous analysis for the same pipeline
  const currentScore = currentAnalysis.driftScore
  const previousAnalysis = history.find(a => 
    a.pipelineName === currentAnalysis.pipelineName && 
    a.id !== currentAnalysis.id &&
    a.timestamp < currentAnalysis.timestamp
  )

  if (!previousAnalysis) {
    return null
  }

  const previousScore = previousAnalysis.driftScore
  const change = currentScore - previousScore
  const changePercent = previousScore > 0 
    ? ((change / previousScore) * 100).toFixed(1)
    : change.toFixed(1)

  return {
    change: change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1),
    changePercent: change > 0 ? `+${changePercent}%` : `${changePercent}%`,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    previousScore,
  }
}

/**
 * Format drift analysis for API response
 * @param {Object} analysis - DriftAnalysis object from detector
 * @param {Object[]} history - Optional history for trend calculation
 * @returns {Object} Formatted DriftAnalysis for API
 */
export function formatDriftAnalysis(analysis, history = []) {
  if (!analysis) {
    return null
  }

  const trend = calculateScoreTrend(analysis, history)

  return {
    id: analysis.id,
    pipelineName: analysis.pipelineName,
    driftScore: analysis.driftScore,
    riskLevel: analysis.riskLevel,
    timestamp: analysis.timestamp,
    issues: formatSecurityIssues(analysis.issues || []),
    trend: trend || null,
  }
}

/**
 * Generate complete report data for dashboard
 * @param {Object} currentAnalysis - Current DriftAnalysis
 * @param {Object[]} history - Analysis history
 * @param {Object} stats - Statistics
 * @param {Object} options - Additional options
 * @param {Object[]} options.baselineSteps - Baseline pipeline steps (optional)
 * @param {Object[]} options.currentSteps - Current pipeline steps (optional)
 * @returns {Object} Complete report data
 */
export function generateReport(currentAnalysis, history = [], stats = {}, options = {}) {
  const report = {
    analysis: formatDriftAnalysis(currentAnalysis),
    timeline: createTimelineData(history),
    stats: generateQuickStats(history, stats),
  }

  // Add pipeline comparison if steps are provided
  if (options.baselineSteps && options.currentSteps) {
    const comparison = generatePipelineComparison(
      options.baselineSteps,
      options.currentSteps
    )
    report.baselinePipeline = comparison.baseline
    report.currentPipeline = comparison.current
  }

  return report
}
