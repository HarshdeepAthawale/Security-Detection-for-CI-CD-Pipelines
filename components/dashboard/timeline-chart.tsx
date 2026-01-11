"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts"
import type { TimelineDataPoint } from "@/lib/types"

interface TimelineChartProps {
  data: TimelineDataPoint[]
}

export function TimelineChart({ data }: TimelineChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as TimelineDataPoint
      return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            Score: <span className="font-mono text-foreground">{dataPoint.score}</span>
          </p>
          {dataPoint.event && <p className="mt-1 text-xs text-primary">{dataPoint.event}</p>}
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Drift Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <p className="text-sm">No timeline data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Drift Timeline</span>
          <span className="text-xs">Last {data.length} days</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={50} stroke="hsl(var(--warning))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="url(#scoreGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded bg-yellow-500" />
            <span>Medium threshold (50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded bg-red-500" />
            <span>High threshold (70)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
