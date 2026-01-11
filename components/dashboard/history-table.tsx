"use client"

import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DriftAnalysis } from "@/lib/types"

interface HistoryTableProps {
  history: DriftAnalysis[]
}

export function HistoryTable({ history }: HistoryTableProps) {
  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
      case "low":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-red-500"
    if (score >= 50) return "text-orange-500"
    if (score >= 30) return "text-yellow-500"
    return "text-green-500"
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
          <Button variant="ghost" size="sm" className="text-xs text-primary">
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
                  <td className={`py-3 font-bold tabular-nums ${getScoreColor(item.driftScore)}`}>{item.driftScore}</td>
                  <td className="py-3">
                    <Badge variant="outline" className={`capitalize ${getRiskBadge(item.riskLevel)}`}>
                      {item.riskLevel}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">{item.issues.length} detected</td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
