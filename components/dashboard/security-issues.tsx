"use client"

import { AlertTriangle, ShieldAlert, ShieldX, Shield, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SecurityIssue } from "@/lib/types"

interface SecurityIssuesProps {
  issues: SecurityIssue[]
}

export function SecurityIssues({ issues }: SecurityIssuesProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <ShieldX className="h-4 w-4 text-red-500" />
      case "high":
        return <ShieldAlert className="h-4 w-4 text-orange-500" />
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "low":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30 hover:bg-orange-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30"
      case "low":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30 hover:bg-blue-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const sortedIssues = [...issues].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.severity] - order[b.severity]
  })

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Security Changes Detected</span>
            <Badge variant="outline" className="text-xs">
              0 issues
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No security issues detected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Security Changes Detected</span>
          <Badge variant="outline" className="text-xs">
            {issues.length} issues
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedIssues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary"
            >
              {getSeverityIcon(issue.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{issue.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground font-mono">Step: {issue.step}</p>
              </div>
              <Badge variant="outline" className={`shrink-0 capitalize ${getSeverityBadge(issue.severity)}`}>
                {issue.severity}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
