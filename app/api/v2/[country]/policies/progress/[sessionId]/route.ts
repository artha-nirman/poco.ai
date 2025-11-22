/**
 * V2 Country-Aware Policy Progress Route
 * Real-time processing status with country context
 * 
 * URL: /api/v2/{country}/policies/progress/{sessionId}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSessionStore } from '@/lib/database/session-store'
import { loadCountryConfig } from '@/lib/config/country-loader'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string; sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { country, sessionId } = await params
    const countryCode = country.toUpperCase()
    
    // Validate country support
    let countryConfig
    try {
      countryConfig = await loadCountryConfig(countryCode)
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Unsupported country',
          message: `Country ${countryCode} is not currently supported`,
          supported_countries: ['AU', 'SG', 'NZ']
        },
        { status: 400 }
      )
    }
    
    // Get progress from session store
    const sessionStore = createSessionStore()
    const progress = await sessionStore.getProgress(sessionId)
    
    if (!progress) {
      return NextResponse.json(
        { 
          error: 'Session not found',
          message: `No analysis session found with ID: ${sessionId}`
        },
        { status: 404 }
      )
    }
    
    // Convert to V2 format
    const v2Progress = {
      session_id: sessionId,
      country_code: countryCode,
      country_name: countryConfig.countryName,
      status: progress.stage === 'completed' ? 'completed' : progress.stage === 'failed' ? 'failed' : 'processing',
      current_stage: progress.stage,
      progress_percentage: progress.progress || 0,
      stage_details: {
        current: progress.stage,
        message: progress.message || 'Processing...',
        estimated_remaining_time: progress.estimatedTimeRemaining || null
      },
      metadata: {
        last_updated: new Date().toISOString(),
        country_config: countryConfig,
        api_version: '2.0'
      }
    }
    
    return NextResponse.json(v2Progress, {
      headers: {
        'x-poco-session-id': sessionId,
        'x-poco-country': countryCode,
        'x-poco-api-version': '2.0',
        'cache-control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('Progress retrieval error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve analysis progress'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET to check progress' },
    { status: 405 }
  )
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET to check progress' },
    { status: 405 }
  )
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET to check progress' },
    { status: 405 }
  )
}