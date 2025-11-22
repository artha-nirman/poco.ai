/**
 * Direct Country-Level Results Route
 * Clean URL endpoint that implements V2 functionality directly
 * 
 * URL: /{country}/policies/results/{sessionId}
 */

import { NextRequest, NextResponse } from 'next/server'
import { V2DatabaseSessionStore } from '@/lib/database/v2-session-store'
import { loadCountryConfig } from '@/lib/config/country-loader'

/**
 * GET endpoint for results retrieval with clean URLs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string; sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { country, sessionId } = await params
    const countryCode = country.toUpperCase()
    
    // Validate country
    const countryConfig = await loadCountryConfig(countryCode)
    if (!countryConfig) {
      return NextResponse.json(
        { error: 'Unsupported country' },
        { status: 400 }
      )
    }

    // Get analysis results
    const sessionStore = new V2DatabaseSessionStore()
    const results = await sessionStore.getSessionResults(sessionId)
    
    if (!results) {
      return NextResponse.json(
        { error: 'Results not found' },
        { status: 404 }
      )
    }

    // Check if analysis is complete by looking at the results structure
    if (!results.metadata || !results.policy) {
      return NextResponse.json(
        { 
          error: 'Analysis not complete',
          progress_url: `/${country.toLowerCase()}/policies/progress/${sessionId}`
        },
        { status: 202 }
      )
    }

    return NextResponse.json(results)
    
  } catch (error) {
    console.error('Results retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve results' },
      { status: 500 }
    )
  }
}