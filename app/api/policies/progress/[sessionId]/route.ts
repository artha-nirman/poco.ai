import { NextRequest, NextResponse } from 'next/server';
import { CorePolicyProcessor } from '@/lib/services/policy-processor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if client wants SSE
    const accept = request.headers.get('accept');
    if (accept?.includes('text/event-stream')) {
      return handleSSE(sessionId);
    }

    // Fallback to regular JSON response for compatibility
    const processor = CorePolicyProcessor.getInstance();
    const progress = await processor.getProgress(sessionId);
    
    console.log(`Progress request for ${sessionId}:`, progress);
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Format the response to match UI expectations
    const formattedProgress = {
      stage: progress.message || progress.stage,
      progress: progress.progress,
      estimatedTimeRemaining: progress.estimatedTimeRemaining || 0,
      isComplete: progress.progress >= 100,
      error: progress.stage === 'error' ? 'Processing failed' : undefined
    };

    return NextResponse.json({
      success: true,
      sessionId,
      progress: formattedProgress
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function handleSSE(sessionId: string) {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  
  const stream = new ReadableStream({
    start(controller) {
      console.log(`🔗 SSE connection started for session: ${sessionId}`);
      const processor = CorePolicyProcessor.getInstance();
      
      const sendUpdate = async () => {
        try {
          const progress = await processor.getProgress(sessionId);
          
          if (progress) {
            const formattedProgress = {
              stage: progress.message || progress.stage,
              progress: progress.progress,
              estimatedTimeRemaining: progress.estimatedTimeRemaining || 0,
              isComplete: progress.progress >= 100,
              error: progress.stage === 'error' ? 'Processing failed' : undefined
            };

            console.log(`📡 SSE sending progress for ${sessionId}:`, formattedProgress);

            const data = `data: ${JSON.stringify({
              type: 'progress',
              sessionId,
              progress: formattedProgress
            })}\n\n`;
            
            controller.enqueue(encoder.encode(data));
            
            // If complete, try to send results
            if (formattedProgress.isComplete) {
              const results = await processor.getResults(sessionId);
              if (results) {
                console.log(`✅ SSE sending results for ${sessionId}`);
                const resultData = `data: ${JSON.stringify({
                  type: 'results',
                  sessionId,
                  results
                })}\n\n`;
                controller.enqueue(encoder.encode(resultData));
                
                // Close the stream
                if (intervalId) clearInterval(intervalId);
                controller.close();
                return;
              }
            }
          } else {
            console.log(`❌ SSE session not found: ${sessionId}`);
            // Session not found, send error and close
            const errorData = `data: ${JSON.stringify({
              type: 'error',
              sessionId,
              error: 'Session not found'
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            if (intervalId) clearInterval(intervalId);
            controller.close();
            return;
          }
        } catch (error) {
          console.error(`💥 SSE error for ${sessionId}:`, error);
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            sessionId,
            error: 'Internal server error'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          if (intervalId) clearInterval(intervalId);
          controller.close();
        }
      };
      
      // Send initial connection message
      const initData = `data: ${JSON.stringify({
        type: 'connected',
        sessionId
      })}\n\n`;
      controller.enqueue(encoder.encode(initData));
      
      // Start sending updates every second
      intervalId = setInterval(sendUpdate, 1000);
      
      // Also send an immediate update
      setTimeout(sendUpdate, 100);
    },
    
    cancel() {
      console.log(`🔌 SSE connection cancelled for session: ${sessionId}`);
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}