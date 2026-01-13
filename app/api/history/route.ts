/**
 * Next.js API route for fetching analysis history
 * Proxies requests to the backend server
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(request: Request) {
  try {
    // Extract query parameters from URL
    const { searchParams } = new URL(request.url)
    const pipeline = searchParams.get('pipeline')
    const limit = searchParams.get('limit')
    const since = searchParams.get('since')

    // Build query string
    const queryParams = new URLSearchParams()
    if (pipeline) queryParams.append('pipeline', pipeline)
    if (limit) queryParams.append('limit', limit)
    if (since) queryParams.append('since', since)

    const queryString = queryParams.toString()
    const url = `${BACKEND_URL}/api/history${queryString ? `?${queryString}` : ''}`

    // Forward request to backend
    const response = await fetch(url, {
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
          error: errorData.error || 'History fetch failed',
          message: errorData.message || 'Failed to fetch analysis history',
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
