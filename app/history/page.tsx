import { DashboardHeader } from "@/components/dashboard/header"
import { HistoryTable } from "@/components/dashboard/history-table"
import { PipelineLogsList } from "@/components/dashboard/pipeline-logs-list"
import type { DriftAnalysis } from "@/lib/types"

async function fetchHistoryData() {
  try {
    // Fetch history from API
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
      // Cache for 30 seconds
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      // Handle error responses
      const errorData = await response.json().catch(() => null)
      console.error('Failed to fetch history data:', errorData)
      
      return {
        history: [] as DriftAnalysis[],
        error: errorData?.message || 'Failed to fetch history data',
      }
    }

    const data = await response.json()
    
    // Extract history from response
    const history = (data.history || []) as DriftAnalysis[]

    return {
      history,
    }
  } catch (error) {
    // Handle network errors or other exceptions
    console.error('Error fetching history data:', error)
    
    return {
      history: [] as DriftAnalysis[],
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export default async function HistoryPage() {
  const { history, error } = await fetchHistoryData()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">History</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View past security analyses and drift detection results
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Unable to load history data</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
              <p className="mt-2 text-xs">
                Make sure the backend server is running on port 3001.
              </p>
            </div>
          )}

          {/* Pipeline Log Files */}
          <PipelineLogsList />

          {/* History Table */}
          <HistoryTable history={history} />
        </div>
      </main>
    </div>
  )
}
