"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Activity, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DriftAnalysis } from "@/lib/types"

interface DriftScoreCardProps {
  analysis: DriftAnalysis | null
}

export function DriftScoreCard({ analysis }: DriftScoreCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every 30 seconds for real-time relative time display
  useEffect(() => {
    setCurrentTime(new Date())
    
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const formatRelativeTime = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const now = currentTime
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return diffSeconds <= 0 ? 'Just now' : `${diffSeconds}s ago`
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      // For older entries, show full date and time in UTC
      const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      const day = date.getUTCDate()
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      return `${month} ${day}, ${hours}:${minutes} UTC`
    }
  }

  const getRiskStyle = (level: string) => {
    switch (level) {
      case "critical":
        return "text-foreground font-bold border-foreground/30 bg-secondary"
      case "high":
        return "text-foreground font-semibold border-foreground/20 bg-secondary/80"
      case "medium":
        return "text-muted-foreground font-medium border-border bg-secondary/50"
      case "low":
        return "text-muted-foreground border-border bg-secondary/30"
      default:
        return "text-muted-foreground border-border bg-secondary/30"
    }
  }

  const getScoreStyle = (score: number) => {
    if (score >= 70) return "text-foreground font-bold"
    if (score >= 50) return "text-foreground font-semibold"
    if (score >= 30) return "text-muted-foreground font-medium"
    return "text-muted-foreground"
  }

  if (!analysis) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Security Drift Score</span>
            <Activity className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No analysis data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Security Drift Score</span>
          <Activity className="h-4 w-4" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <span className={`text-6xl tabular-nums ${getScoreStyle(analysis.driftScore)}`}>
            {analysis.driftScore}
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">/100</span>
            {analysis.trend && (
              <div className={`flex items-center gap-1 ${
                analysis.trend.direction === 'up' ? 'text-foreground font-semibold' :
                analysis.trend.direction === 'down' ? 'text-muted-foreground' :
                'text-muted-foreground'
              }`}>
                {analysis.trend.direction === 'up' && <TrendingUp className="h-4 w-4" />}
                {analysis.trend.direction === 'down' && <TrendingDown className="h-4 w-4" />}
                {analysis.trend.direction === 'neutral' && <Minus className="h-4 w-4" />}
                <span className="text-sm">{analysis.trend.change}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-sm capitalize ${getRiskStyle(analysis.riskLevel)}`}
          >
            {analysis.riskLevel} Risk
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-sm text-muted-foreground">Pipeline</p>
          <p className="font-mono text-sm text-foreground">{analysis.pipelineName}</p>
        </div>

        <div className="mt-3 space-y-1">
          <p className="text-sm text-muted-foreground">Last Analyzed</p>
          <p className="text-sm text-foreground" title={new Date(analysis.timestamp).toUTCString()}>
            {formatRelativeTime(analysis.timestamp)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
