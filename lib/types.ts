export interface ScoreTrend {
  change: string
  changePercent: string
  direction: "up" | "down" | "neutral"
  previousScore: number
}

export interface DriftAnalysis {
  id: string
  pipelineName: string
  driftScore: number
  riskLevel: "low" | "medium" | "high" | "critical"
  timestamp: string
  issues: SecurityIssue[]
  trend: ScoreTrend | null
}

export interface SecurityIssue {
  id: string
  type: string
  severity: "low" | "medium" | "high" | "critical"
  description: string
  step: string
}

export interface TimelineDataPoint {
  date: string
  score: number
  event?: string
}

export interface PipelineStep {
  name: string
  status: "unchanged" | "added" | "removed" | "modified"
  security: boolean
}

export interface QuickStat {
  label: string
  value: string
  icon: "pipelines" | "clock" | "alerts" | "healthy"
  change: string
  changeType: "positive" | "negative" | "neutral"
}
