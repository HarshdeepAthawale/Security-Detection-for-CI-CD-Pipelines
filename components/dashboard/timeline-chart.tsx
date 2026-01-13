"use client"

import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, CartesianGrid } from "recharts"
import type { TimelineDataPoint } from "@/lib/types"

interface TimelineChartProps {
  data: TimelineDataPoint[]
}

export function TimelineChart({ data }: TimelineChartProps) {
  const { theme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark" || (!resolvedTheme && theme === "dark")
  
  // Professional Cyan Color Palette
  // Dark Mode
  const cyanPrimary = isDark ? "#00E5FF" : "#00ACC1"      // Bright cyan for dark, professional teal-cyan for light
  const cyanSecondary = isDark ? "#00BCD4" : "#0097A7"    // Medium cyan for gradients
  const cyanAccent = isDark ? "#00FFFF" : "#00BCD4"       // Vibrant cyan for active states
  const cyanGlow = isDark ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 172, 193, 0.2)" // Glow effect
  
  // Chart colors
  const chartColor = cyanPrimary
  const activeDotColor = cyanAccent
  const gridColor = isDark ? "rgba(0, 229, 255, 0.08)" : "rgba(0, 172, 193, 0.08)"
  
  // Reference line colors - cyan-tinted for better theme integration
  const refLineColor1 = isDark ? "rgba(0, 229, 255, 0.4)" : "rgba(0, 172, 193, 0.35)"
  const refLineColor2 = isDark ? "rgba(0, 229, 255, 0.6)" : "rgba(0, 172, 193, 0.5)"
  
  const dotStroke = isDark ? "#000000" : "#FFFFFF"
  
  // Enhanced gradient stops for smoother transitions (5 stops)
  const gradientStops = isDark 
    ? [
        { offset: "0%", opacity: 0.5 },
        { offset: "20%", opacity: 0.35 },
        { offset: "50%", opacity: 0.2 },
        { offset: "80%", opacity: 0.1 },
        { offset: "100%", opacity: 0.05 }
      ]
    : [
        { offset: "0%", opacity: 0.4 },
        { offset: "20%", opacity: 0.25 },
        { offset: "50%", opacity: 0.15 },
        { offset: "80%", opacity: 0.08 },
        { offset: "100%", opacity: 0.03 }
      ]
  
  // Transform data to use timestamps for X-axis (more reliable for Recharts)
  const chartData = data.map((point) => {
    const timestamp = new Date(point.date).getTime()
    return {
      ...point,
      timestamp, // Use timestamp for X-axis
      date: point.date, // Keep original date for tooltip
    }
  }).sort((a, b) => a.timestamp - b.timestamp) // Ensure sorted by time

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as TimelineDataPoint & { timestamp?: number }
      const date = new Date(dataPoint.date)
      const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      const day = date.getUTCDate()
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      const formattedDate = `${month} ${day}, ${hours}:${minutes} UTC`
      
      return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{formattedDate}</p>
          <p className="text-sm text-muted-foreground">
            Score: <span className="font-mono text-foreground">{dataPoint.score}</span>
          </p>
          {dataPoint.event && <p className="mt-1 text-xs text-foreground">{dataPoint.event}</p>}
        </div>
      )
    }
    return null
  }

  // Format timestamp for X-axis ticks
  const formatXAxisDate = (tickItem: number) => {
    try {
      const date = new Date(tickItem)
      // Show month and day for better readability in UTC
      const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      const day = date.getUTCDate()
      return `${month} ${day}`
    } catch {
      return ''
    }
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

  // Calculate time range for display
  const daysRange = data.length > 0 
    ? Math.ceil((new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / (1000 * 60 * 60 * 24)) || 1
    : 1

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Drift Timeline</span>
          <span className="text-xs">Last {daysRange} {daysRange === 1 ? 'day' : 'days'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: 5, bottom: 20 }}
            >
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  {gradientStops.map((stop, index) => (
                    <stop 
                      key={index}
                      offset={stop.offset} 
                      stopColor={chartColor} 
                      stopOpacity={stop.opacity} 
                    />
                  ))}
                </linearGradient>
                {/* Glow filter for enhanced visual effect */}
                <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={formatXAxisDate}
                angle={-45}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                axisLine={true}
                tickLine={true}
                tick={{ fill: isDark ? "rgba(0, 229, 255, 0.8)" : "rgba(0, 172, 193, 0.8)", fontSize: 12, fontWeight: 500 }}
                stroke={isDark ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 172, 193, 0.3)"}
                width={40}
              />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.4} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={50} stroke={refLineColor1} strokeDasharray="3 3" strokeOpacity={0.7} />
              <ReferenceLine y={70} stroke={refLineColor2} strokeDasharray="3 3" strokeOpacity={0.8} />
              <Area
                type="monotone"
                dataKey="score"
                stroke={chartColor}
                fill="url(#scoreGradient)"
                strokeWidth={3}
                filter="url(#cyanGlow)"
                dot={{ fill: chartColor, r: 4.5, strokeWidth: 2.5, stroke: dotStroke }}
                activeDot={{ 
                  r: 7, 
                  fill: activeDotColor, 
                  strokeWidth: 3, 
                  stroke: dotStroke,
                  style: { filter: `drop-shadow(0 0 6px ${cyanGlow})` }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded" style={{ backgroundColor: refLineColor1 }} />
            <span>Medium threshold (50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded" style={{ backgroundColor: refLineColor2 }} />
            <span>High threshold (70)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded" style={{ backgroundColor: chartColor }} />
            <span>Drift Score</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
