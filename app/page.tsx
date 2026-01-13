import { DashboardHeader } from "@/components/dashboard/header"
import { DriftScoreCard } from "@/components/dashboard/drift-score-card"
import { TimelineChart } from "@/components/dashboard/timeline-chart"
import { SecurityIssues } from "@/components/dashboard/security-issues"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { LogUploadDialog } from "@/components/dashboard/log-upload"
import type { DriftAnalysis, TimelineDataPoint, QuickStat } from "@/lib/types"

async function fetchDashboardData() {
  try {
    // Fetch history which includes timeline and stats
    // Use absolute URL for server-side fetch in Next.js
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
      (process.env.NODE_ENV === 'production' 
        ? `https://${process.env.VERCEL_URL || 'localhost:3000'}`
        : 'http://localhost:3000')
    
    const response = await fetch(`${baseUrl}/api/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // No cache to ensure fresh data after upload
      cache: 'no-store',
    })

    if (!response.ok) {
      // Handle error responses
      const errorData = await response.json().catch(() => null)
      console.error('Failed to fetch dashboard data:', errorData)
      
      return {
        analysis: null as DriftAnalysis | null,
        timelineData: [] as TimelineDataPoint[],
        stats: [] as QuickStat[],
        error: errorData?.message || 'Failed to fetch dashboard data',
      }
    }

    const data = await response.json()
    
    // Extract data from response
    // The latest analysis is the first item in history (most recent)
    const analysis = data.history && data.history.length > 0 
      ? data.history[0] as DriftAnalysis 
      : null
    
    const timelineData = (data.timeline || []) as TimelineDataPoint[]
    const stats = (data.stats || []) as QuickStat[]

    return {
      analysis,
      timelineData,
      stats,
    }
  } catch (error) {
    // Handle network errors or other exceptions
    console.error('Error fetching dashboard data:', error)
    
    return {
      analysis: null as DriftAnalysis | null,
      timelineData: [] as TimelineDataPoint[],
      stats: [] as QuickStat[],
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export default async function DashboardPage() {
  const { analysis, timelineData, stats, error } = await fetchDashboardData()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Unable to load dashboard data</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
              <p className="mt-2 text-xs">
                Make sure the backend server is running on port 3001.
              </p>
            </div>
          )}

          {/* Upload Section */}
          <div className="flex justify-end">
            <LogUploadDialog />
          </div>

          {/* Quick Stats */}
          <QuickStats stats={stats} />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drift Score Card */}
            <DriftScoreCard analysis={analysis} />

            {/* Timeline Chart */}
            <div className="lg:col-span-2">
              <TimelineChart data={timelineData} />
            </div>
          </div>

          {/* Security Issues */}
          <SecurityIssues issues={analysis?.issues ?? []} />
        </div>
      </main>
    </div>
  )
}
