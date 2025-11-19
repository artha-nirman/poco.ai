import { NextRequest, NextResponse } from 'next/server';
import { CorePolicyProcessor } from '@/lib/services/policy-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('policy') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No policy file provided' },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Initialize policy processor (singleton)
    const processor = CorePolicyProcessor.getInstance();
    
    // Create session immediately to ensure it exists for SSE
    await processor.createSession(sessionId);
    
    // Start processing (this will take 2-3 minutes)
    console.log(`Starting analysis for session ${sessionId}`);
    
    // In a real implementation, we'd process this in the background
    // For now, we'll start processing and return the session ID immediately
    processor.processPolicy(sessionId, buffer).catch((error: any) => {
      console.error(`Processing failed for session ${sessionId}:`, error);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Analysis started. Use the session ID to check progress.',
      estimatedTime: '2-3 minutes'
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}