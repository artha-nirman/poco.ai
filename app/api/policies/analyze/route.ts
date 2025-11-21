import { NextRequest, NextResponse } from 'next/server';
import { CorePolicyProcessor } from '@/lib/services/policy-processor';
import { API_ERRORS, ERROR_MESSAGES, PROCESSING_CONFIG } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    let sessionId: string;
    let contentToProcess: Buffer;
    let fileName: string;
    let isDirectFileUpload = false;
    
    if (contentType?.includes('application/json')) {
      // Handle JSON request from privacy protection system
      // This is for already-processed text content that went through privacy protection
      const body = await request.json();
      
      if (!body.anonymizedContent && !body.originalContent) {
        return NextResponse.json(
          { 
            error: API_ERRORS.NO_FILE_PROVIDED,
            message: ERROR_MESSAGES[API_ERRORS.NO_FILE_PROVIDED]
          },
          { status: 400 }
        );
      }

      // Use existing session ID if provided, or generate new one
      sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // This is text content that should be processed as text (not through Document AI)
      const textContent = body.anonymizedContent || body.originalContent;
      contentToProcess = Buffer.from(textContent, 'utf-8');
      fileName = 'anonymized_document.txt';
      
    } else {
      // Handle FormData request (direct file upload)
      // This is for binary files (PDFs) that need Document AI processing first
      const formData = await request.formData();
      const file = formData.get('policy') as File;
      
      if (!file) {
        return NextResponse.json(
          { 
            error: API_ERRORS.NO_FILE_PROVIDED,
            message: ERROR_MESSAGES[API_ERRORS.NO_FILE_PROVIDED]
          },
          { status: 400 }
        );
      }

      // Allow PDF and supported image formats for Document AI
      const supportedTypes = [
        'application/pdf',
        'image/png', 
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/webp'
      ];

      if (!supportedTypes.includes(file.type)) {
        return NextResponse.json(
          { 
            error: API_ERRORS.INVALID_FILE_TYPE,
            message: `Invalid file type. Please upload: ${supportedTypes.join(', ')}`
          },
          { status: 400 }
        );
      }

      if (file.size > PROCESSING_CONFIG.MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { 
            error: API_ERRORS.FILE_TOO_LARGE,
            message: ERROR_MESSAGES[API_ERRORS.FILE_TOO_LARGE]
          },
          { status: 400 }
        );
      }

      // Generate session ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert file to buffer - preserve binary data for Document AI
      contentToProcess = Buffer.from(await file.arrayBuffer());
      
      // Store filename for proper file type detection
      fileName = file.name;
      isDirectFileUpload = true;
    }
    
    // Initialize policy processor (singleton)
    const processor = CorePolicyProcessor.getInstance();
    
    // Create session immediately to ensure it exists for SSE
    await processor.createSession(sessionId);
    
    // Start processing (this will take 2-3 minutes)
    console.log(`Starting analysis for session ${sessionId}`);
    
    // In a real implementation, we'd process this in the background
    // For now, we'll start processing and return the session ID immediately
    processor.processPolicy(
      sessionId, 
      contentToProcess, 
      fileName, 
      !isDirectFileUpload // Skip Document AI for JSON/text content
    ).catch((error: any) => {
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
      { 
        error: API_ERRORS.PROCESSING_FAILED,
        message: ERROR_MESSAGES[API_ERRORS.PROCESSING_FAILED]
      },
      { status: 500 }
    );
  }
}