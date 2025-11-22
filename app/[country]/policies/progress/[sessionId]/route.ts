/**
 * Direct Country-Level Progress Route  
 * Clean URL endpoint that implements V2 functionality with SSE support
 * 
 * URL: /{country}/policies/progress/{sessionId}
 */

import { NextRequest, NextResponse } from 'next/server'
import { V2DatabaseSessionStore } from '@/lib/database/v2-session-store'
import { loadCountryConfig } from '@/lib/config/country-loader'
import { CorePolicyProcessor } from '@/lib/services/policy-processor'

/**
 * GET endpoint for progress tracking with clean URLs and SSE support
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

    // Check if client wants SSE
    const accept = request.headers.get('accept')
    if (accept?.includes('text/event-stream')) {
      return handleV2SSE(sessionId, countryCode)
    }

    // Fallback to regular JSON response for compatibility
    const sessionStore = new V2DatabaseSessionStore()
    const progress = await sessionStore.getSessionProgress(sessionId)
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const response = {
      session_id: sessionId,
      status: (progress as any).status,
      progress_percentage: (progress as any).progress_percentage || 0,
      current_step: (progress as any).current_stage || 'initializing',
      estimated_completion: (progress as any).estimated_completion,
      country: countryCode,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('V2 Progress tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve progress' },
      { status: 500 }
    )
  }
}

/**
 * V2 Server-Sent Events handler for real-time progress updates
 */
function handleV2SSE(sessionId: string, countryCode: string) {
  const encoder = new TextEncoder()
  let intervalId: NodeJS.Timeout | null = null
  let lastProgress: any = null // Track last sent progress to avoid duplicates
  
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
                
                // Close the stream
                if (intervalId) clearInterval(intervalId)
                controller.close()
                return
              }
            }
          } else {
            // Only send session not found once
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
      
      // Start checking for updates every 2 seconds (less frequent)
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