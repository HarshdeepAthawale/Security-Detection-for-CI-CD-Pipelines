"use client"

import { GitBranch, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { QuickStat } from "@/lib/types"

interface QuickStatsProps {
  stats: QuickStat[]
}

export function QuickStats({ stats }: QuickStatsProps) {
  const getIcon = (icon: QuickStat["icon"]) => {
    switch (icon) {
      case "pipelines":
        return GitBranch
      case "clock":
        return Clock
      case "alerts":
        return AlertTriangle
      case "healthy":
        return CheckCircle
    }
  }

  const getChangeColor = (type: "positive" | "negative" | "neutral") => {
    switch (type) {
      case "positive":
        return "text-green-500"
      case "negative":
        return "text-red-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = getIcon(stat.icon)
        return (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className={`text-xs ${getChangeColor(stat.changeType)}`}>{stat.change}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
