import { DashboardHeader } from "@/components/dashboard/header"
import { PipelineComparison } from "@/components/dashboard/pipeline-comparison"
import type { PipelineStep } from "@/lib/types"

async function fetchPipelineData(pipelineName?: string) {
  try {
    // First, get the pipeline name from history if not provided
    let targetPipeline = pipelineName
    
    if (!targetPipeline) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
        (process.env.NODE_ENV === 'production' 
          ? `https://${process.env.VERCEL_URL || 'localhost:3000'}`
          : 'http://localhost:3000')
      
      // Fetch history to get latest pipeline name
      const historyResponse = await fetch(`${baseUrl}/api/history?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 30 },
      })

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        if (historyData.history && historyData.history.length > 0) {
          targetPipeline = historyData.history[0].pipelineName
        }
      }
    }

    if (!targetPipeline) {
      return {
        baselinePipeline: [] as PipelineStep[],
        currentPipeline: [] as PipelineStep[],
        error: 'No pipeline data available. Please analyze a pipeline first.',
      }
    }

    // Fetch pipeline comparison data
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
      (process.env.NODE_ENV === 'production' 
        ? `https://${process.env.VERCEL_URL || 'localhost:3000'}`
        : 'http://localhost:3000')
    
    const response = await fetch(`${baseUrl}/api/pipelines/${encodeURIComponent(targetPipeline)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        baselinePipeline: [] as PipelineStep[],
        currentPipeline: [] as PipelineStep[],
        error: errorData?.message || 'Failed to fetch pipeline data',
      }
    }

    const data = await response.json()
    
    return {
      baselinePipeline: (data.baseline || []) as PipelineStep[],
      currentPipeline: (data.current || []) as PipelineStep[],
      pipelineName: data.pipelineName,
    }
  } catch (error) {
    console.error('Error fetching pipeline data:', error)
    return {
      baselinePipeline: [] as PipelineStep[],
      currentPipeline: [] as PipelineStep[],
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export default async function PipelinesPage() {
  const { baselinePipeline, currentPipeline, pipelineName, error } = await fetchPipelineData()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pipelines</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View and compare CI/CD pipeline configurations
              {pipelineName && (
                <span className="ml-2 font-mono text-xs">({pipelineName})</span>
              )}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Unable to load pipeline data</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
              <p className="mt-2 text-xs">
                Make sure the backend server is running on port 3001 and you have analyzed at least one pipeline.
              </p>
            </div>
          )}

          {/* Pipeline Comparison */}
          <PipelineComparison baseline={baselinePipeline} current={currentPipeline} />
        </div>
      </main>
    </div>
  )
}
