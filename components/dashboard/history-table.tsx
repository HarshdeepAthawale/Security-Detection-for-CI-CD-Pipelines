"use client"

import { useState, useEffect } from "react"
import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DriftAnalysis } from "@/lib/types"

interface HistoryTableProps {
  history: DriftAnalysis[]
}

export function HistoryTable({ history }: HistoryTableProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every 30 seconds for real-time relative time display
  useEffect(() => {
    // Set initial time
    setCurrentTime(new Date())
    
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // Update every 30 seconds for more real-time feel

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

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-secondary text-foreground border-foreground/30 font-bold"
      case "high":
        return "bg-secondary/80 text-foreground border-foreground/20 font-semibold"
      case "medium":
        return "bg-secondary/50 text-muted-foreground border-border font-medium"
      case "low":
        return "bg-secondary/30 text-muted-foreground border-border"
      default:
        return "bg-secondary/30 text-muted-foreground border-border"
    }
  }

  const getScoreStyle = (score: number) => {
    if (score >= 70) return "text-foreground font-bold"
    if (score >= 50) return "text-foreground font-semibold"
    if (score >= 30) return "text-muted-foreground font-medium"
    return "text-muted-foreground"
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Recent Analyses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No analysis history available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Recent Analyses</span>
          <Button variant="ghost" size="sm" className="text-xs text-foreground hover:text-foreground">
            View All
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Pipeline</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Risk</th>
                <th className="pb-2 font-medium">Issues</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-border/50 text-sm transition-colors hover:bg-secondary/50">
                  <td className="py-3 font-mono text-foreground">{item.pipelineName}</td>
                  <td className={`py-3 tabular-nums ${getScoreStyle(item.driftScore)}`}>{item.driftScore}</td>
                  <td className="py-3">
                    <Badge variant="outline" className={`capitalize ${getRiskBadge(item.riskLevel)}`}>
                      {item.riskLevel}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">{item.issues.length} detected</td>
                  <td className="py-3 text-muted-foreground" title={new Date(item.timestamp).toUTCString()}>
                    {formatRelativeTime(item.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
