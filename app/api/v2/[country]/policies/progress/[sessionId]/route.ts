/**
 * V2 Country-Aware Policy Progress Route
 * Real-time processing status with country context
 * 
 * URL: /api/v2/{country}/policies/progress/{sessionId}
 */

import { NextRequest, NextResponse } from 'next/server'
import { CorePolicyProcessor } from '@/lib/services/policy-processor'
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
    
    // Check if client wants SSE (either via Accept header or stream query param)
    const accept = request.headers.get('accept')
    const url = new URL(request.url)
    const streamParam = url.searchParams.get('stream') === 'true'
    const wantsSSE = accept?.includes('text/event-stream') || streamParam
    
    if (wantsSSE) {
      console.log('🔗 V2 SSE requested for session:', sessionId)
      return handleV2SSE(sessionId, countryCode, countryConfig)
    }
    
    // Get progress from policy processor
    const processor = CorePolicyProcessor.getInstance()
    const progress = await processor.getProgress(sessionId)
    
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

/**
 * V2 Server-Sent Events handler for real-time progress updates
 */
function handleV2SSE(sessionId: string, countryCode: string, countryConfig: any) {
  const encoder = new TextEncoder()
  let intervalId: NodeJS.Timeout | null = null
  let lastProgress: any = null
  
  const stream = new ReadableStream({
    start(controller) {
      console.log(`🔗 V2 SSE connection started for session: ${sessionId} (${countryCode})`)
      const processor = CorePolicyProcessor.getInstance()
      
      const sendUpdate = async () => {
        try {
          const progress = await processor.getProgress(sessionId)
          
          if (progress) {
            const formattedProgress = {
              stage: progress.message || progress.stage,
              progress: progress.progress,
              estimatedTimeRemaining: progress.estimatedTimeRemaining || 0,
              isComplete: progress.progress >= 100,
              error: progress.stage === 'error' ? 'Processing failed' : undefined
            }

            // Only send if progress has actually changed
            const progressKey = `${formattedProgress.progress}-${formattedProgress.stage}`
            const lastProgressKey = lastProgress ? `${lastProgress.progress}-${lastProgress.stage}` : null
            
            if (progressKey !== lastProgressKey) {
              console.log(`📡 V2 SSE sending progress for ${sessionId}:`, formattedProgress)
              lastProgress = formattedProgress

              const data = `data: ${JSON.stringify({
                type: 'progress',
                sessionId,
                country: countryCode,
                progress: formattedProgress
              })}\n\n`
              
              controller.enqueue(encoder.encode(data))
            }
            
            // If complete, try to send results
            if (formattedProgress.isComplete) {
              const results = await processor.getResults(sessionId)
              if (results) {
                console.log(`✅ V2 SSE sending results for ${sessionId}`)
                const resultData = `data: ${JSON.stringify({
                  type: 'results',
                  sessionId,
                  country: countryCode,
                  results
                })}\n\n`
                controller.enqueue(encoder.encode(resultData))
                
                if (intervalId) clearInterval(intervalId)
                controller.close()
                return
              }
            }
          } else {
            if (!lastProgress || lastProgress !== 'not-found') {
              console.log(`❌ V2 SSE session not found: ${sessionId}`)
              lastProgress = 'not-found'
              const errorData = `data: ${JSON.stringify({
                type: 'error',
                sessionId,
                country: countryCode,
                error: 'Session not found'
              })}\n\n`
              controller.enqueue(encoder.encode(errorData))
              if (intervalId) clearInterval(intervalId)
              controller.close()
              return
            }
          }
        } catch (error) {
          console.error(`💥 V2 SSE error for ${sessionId}:`, error)
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            sessionId,
            country: countryCode,
            error: 'Internal server error'
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          if (intervalId) clearInterval(intervalId)
          controller.close()
        }
      }
      
      // Send initial connection message
      const initData = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        country: countryCode
      })}\n\n`
      controller.enqueue(encoder.encode(initData))
      
      // Start checking for updates every 2 seconds
      intervalId = setInterval(sendUpdate, 2000)
      
      // Send an immediate update
      setTimeout(sendUpdate, 100)
    },
    
    cancel() {
      console.log(`🔌 V2 SSE connection cancelled for session: ${sessionId}`)
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
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