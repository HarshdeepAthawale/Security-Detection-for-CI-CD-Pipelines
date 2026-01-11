"use client"

import { Check, X, AlertCircle, Minus, Shield, ArrowRight } from "lucide-react"
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
        return <X className="h-4 w-4 text-red-500" />
      case "added":
        return <Check className="h-4 w-4 text-green-500" />
      case "modified":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "removed":
        return "border-red-500/30 bg-red-500/10 text-red-400 line-through"
      case "added":
        return "border-green-500/30 bg-green-500/10 text-green-400"
      case "modified":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
      default:
        return "border-border bg-secondary/50 text-foreground"
    }
  }

  const removedCount = baseline.filter((s) => s.status === "removed").length
  const modifiedCount = [...baseline, ...current].filter((s) => s.status === "modified").length / 2
  const securityAffectedCount = [...baseline, ...current].filter(
    (s) => s.security && (s.status === "removed" || s.status === "modified"),
  ).length

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
              <div className="h-2 w-2 rounded-full bg-red-500" />
              Removed
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
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
              <Shield className="h-4 w-4 text-green-500" />
              Baseline Pipeline
            </h4>
            <div className="space-y-2">
              {baseline.map((step, index) => (
                <div
                  key={`baseline-${index}`}
                  className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${getStatusStyle(step.status)}`}
                >
                  {getStatusIcon(step.status)}
                  <span className="flex-1 truncate">{step.name}</span>
                  {step.security && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Current Pipeline */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Current Pipeline
            </h4>
            <div className="space-y-2">
              {current.map((step, index) => (
                <div
                  key={`current-${index}`}
                  className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${getStatusStyle(step.status)}`}
                >
                  {getStatusIcon(step.status)}
                  <span className="flex-1 truncate">{step.name}</span>
                  {step.security && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary - now dynamically calculated */}
        <div className="mt-4 flex items-center justify-center gap-4 rounded-lg border border-border bg-secondary/30 p-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{removedCount}</p>
            <p className="text-xs text-muted-foreground">Steps Removed</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">{Math.floor(modifiedCount)}</p>
            <p className="text-xs text-muted-foreground">Steps Modified</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{securityAffectedCount}</p>
            <p className="text-xs text-muted-foreground">Security Steps Affected</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
