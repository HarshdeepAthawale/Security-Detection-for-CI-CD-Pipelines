/**
 * Next.js API route for fetching pipeline comparison data
 * Proxies requests to the backend server
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pipelineName: string }> }
) {
  try {
    const { pipelineName } = await params

    if (!pipelineName) {
      return Response.json(
        {
          error: 'Invalid request',
          message: 'Pipeline name is required',
        },
        { status: 400 }
      )
    }

    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/pipelines/${encodeURIComponent(pipelineName)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Unknown error',
        message: `Backend returned status ${response.status}`,
      }))

      return Response.json(
        {
          error: errorData.error || 'Pipeline fetch failed',
          message: errorData.message || 'Failed to fetch pipeline data',
        },
        { status: response.status }
      )
    }

    // Return successful response
    const data = await response.json()
    return Response.json(data, { status: 200 })
  } catch (error) {
    // Handle network errors or other exceptions
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error - backend server unavailable
      return Response.json(
        {
          error: 'Backend unavailable',
          message: 'Unable to connect to backend server. Please ensure the backend is running on port 3001.',
        },
        { status: 503 }
      )
    }

    // Other errors
    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
