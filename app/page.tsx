import { DashboardHeader } from "@/components/dashboard/header"
import { DriftScoreCard } from "@/components/dashboard/drift-score-card"
import { TimelineChart } from "@/components/dashboard/timeline-chart"
import { SecurityIssues } from "@/components/dashboard/security-issues"
import { PipelineComparison } from "@/components/dashboard/pipeline-comparison"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { HistoryTable } from "@/components/dashboard/history-table"
import type { DriftAnalysis, TimelineDataPoint, PipelineStep, QuickStat } from "@/lib/types"

async function fetchDashboardData() {
  // TODO: Replace with actual API calls
  // const analysis = await fetch('/api/analyze', { method: 'POST' }).then(r => r.json())
  // const history = await fetch('/api/history').then(r => r.json())

  // Return empty/default data structure - connect your API here
  return {
    analysis: null as DriftAnalysis | null,
    timelineData: [] as TimelineDataPoint[],
    baselinePipeline: [] as PipelineStep[],
    currentPipeline: [] as PipelineStep[],
    history: [] as DriftAnalysis[],
    stats: [] as QuickStat[],
  }
}

export default async function DashboardPage() {
  const { analysis, timelineData, baselinePipeline, currentPipeline, history, stats } = await fetchDashboardData()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
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

          {/* Pipeline Comparison */}
          <PipelineComparison baseline={baselinePipeline} current={currentPipeline} />

          {/* History Table */}
          <HistoryTable history={history} />
        </div>
      </main>
    </div>
  )
}
