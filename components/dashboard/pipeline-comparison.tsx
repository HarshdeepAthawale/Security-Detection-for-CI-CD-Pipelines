"use client"

import { Check, X, AlertCircle, Minus, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PipelineStep } from "@/lib/types"

interface PipelineComparisonProps {
  baseline: PipelineStep[]
  current: PipelineStep[]
}

export function PipelineComparison({ baseline, current }: PipelineComparisonProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "removed":
        return <X className="h-4 w-4 text-destructive" />
      case "added":
        return <Check className="h-4 w-4 text-primary" />
      case "modified":
        return <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "removed":
        return "border-destructive/50 bg-destructive/10 text-destructive line-through font-medium"
      case "added":
        return "border-primary/50 bg-primary/10 text-primary"
      case "modified":
        return "border-yellow-500/50 dark:border-yellow-400/50 bg-yellow-500/10 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 font-medium"
      default:
        return "border-border bg-secondary/50 text-foreground"
    }
  }

  // Count removed steps (only in baseline with removed status)
  const removedCount = baseline.filter((s) => s.status === "removed").length
  
  // Count modified steps (only in current with modified status, since baseline shows unchanged for modified steps)
  const modifiedCount = current.filter((s) => s.status === "modified").length
  
  // Count security-affected steps
  const securityAffectedCount = [
    ...baseline.filter((s) => s.security && s.status === "removed"),
    ...current.filter((s) => s.security && (s.status === "modified" || s.status === "added")),
  ].length

  if (baseline.length === 0 && current.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Pipeline Comparison</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No pipeline data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Pipeline Comparison</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-foreground" />
              Removed
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              Modified
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Baseline Pipeline */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              Baseline Pipeline
            </h4>
            <div className="space-y-2">
              {baseline.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No baseline data
                </div>
              ) : (
                baseline.map((step, index) => (
                  <div
                    key={`baseline-${step.name}-${index}`}
                    className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${getStatusStyle(step.status)}`}
                  >
                    {getStatusIcon(step.status)}
                    <span className="flex-1 truncate">{step.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Current Pipeline */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Current Pipeline
            </h4>
            <div className="space-y-2">
              {current.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No current data
                </div>
              ) : (
                current.map((step, index) => (
                  <div
                    key={`current-${step.name}-${index}`}
                    className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${getStatusStyle(step.status)}`}
                  >
                    {getStatusIcon(step.status)}
                    <span className="flex-1 truncate">{step.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Summary - now dynamically calculated */}
        <div className="mt-4 flex items-center justify-center gap-4 rounded-lg border border-border bg-secondary/30 p-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{removedCount}</p>
            <p className="text-xs text-muted-foreground">Steps Removed</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{modifiedCount}</p>
            <p className="text-xs text-muted-foreground">Steps Modified</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{securityAffectedCount}</p>
            <p className="text-xs text-muted-foreground">Security Steps Affected</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
