"use client"

import { TrendingUp, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DriftAnalysis } from "@/lib/types"

interface DriftScoreCardProps {
  analysis: DriftAnalysis | null
}

export function DriftScoreCard({ analysis }: DriftScoreCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-500"
      case "high":
        return "text-orange-500"
      case "medium":
        return "text-yellow-500"
      case "low":
        return "text-green-500"
      default:
        return "text-muted-foreground"
    }
  }

  const getRiskBg = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/20 border-red-500/30"
      case "high":
        return "bg-orange-500/20 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/20 border-yellow-500/30"
      case "low":
        return "bg-green-500/20 border-green-500/30"
      default:
        return "bg-muted"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-red-500"
    if (score >= 50) return "text-orange-500"
    if (score >= 30) return "text-yellow-500"
    return "text-green-500"
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
          <span className={`text-6xl font-bold tabular-nums ${getScoreColor(analysis.driftScore)}`}>
            {analysis.driftScore}
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">/100</span>
            <div className="flex items-center gap-1 text-orange-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">+7</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium capitalize ${getRiskBg(analysis.riskLevel)} ${getRiskColor(analysis.riskLevel)}`}
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
          <p className="text-sm text-foreground">{new Date(analysis.timestamp).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}
