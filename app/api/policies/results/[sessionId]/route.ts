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

    // Get results from processor (singleton)
    const processor = CorePolicyProcessor.getInstance();
    const results = await processor.getResults(sessionId);
    
    console.log(`Results request for ${sessionId}:`, results ? 'Found' : 'Not found');
    
    if (!results) {
      return NextResponse.json(
        { error: 'Results not found or processing not complete' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      results
    });

  } catch (error) {
    console.error('Results API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}