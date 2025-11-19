/**
 * API Route for PII Protection and Privacy Controls
 * Handles document upload, PII detection, and privacy management
 */

import { NextRequest, NextResponse } from 'next/server';
import { piiProtectionService } from '@/lib/security/pii-protection';
import { consentManager, privacyNoticeService } from '@/lib/security/privacy-controls';

interface DocumentUploadRequest {
  content: string;
  sessionId?: string;
  consent?: {
    includeName: boolean;
    includePremium: boolean;
    includeAddress: boolean;
    dataRetention: '1-hour' | '24-hours' | 'session-only';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: DocumentUploadRequest = await request.json();
    
    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: 'Document content is required' },
        { status: 400 }
      );
    }

    // Generate session ID if not provided
    const sessionId = body.sessionId || generateSessionId();

    // LAYER 1: PII Detection and Isolation
    const anonymizedDoc = await piiProtectionService.detectAndIsolatePII(
      body.content,
      sessionId
    );

    // Record consent if provided
    if (body.consent) {
      await consentManager.recordConsent(
        sessionId,
        body.consent,
        request.headers.get('x-forwarded-for') || '127.0.0.1',
        request.headers.get('user-agent') || 'unknown'
      );
    }

    // Generate privacy notice
    const detectedTypes = anonymizedDoc.piiDetected 
      ? ['personal_information'] // Would get actual types from detection result
      : [];
    
    const privacyNotice = privacyNoticeService.generatePrivacyNotice(detectedTypes);

    return NextResponse.json({
      sessionId,
      anonymizedContent: anonymizedDoc.anonymizedContent,
      piiDetected: anonymizedDoc.piiDetected,
      confidence: anonymizedDoc.detectionConfidence,
      encryptionKey: anonymizedDoc.encryptionKey,
      privacyNotice,
      safeForProcessing: true
    });

  } catch (error) {
    console.error('PII protection API error:', error);
    return NextResponse.json(
      { error: 'Document processing failed' },
      { status: 500 }
    );
  }
}

// Privacy Dashboard API
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const encryptionKey = url.searchParams.get('encryptionKey');
    const action = url.searchParams.get('action');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'privacy-report':
        if (!encryptionKey) {
          return NextResponse.json(
            { error: 'Encryption key required for privacy report' },
            { status: 400 }
          );
        }
        
        const report = await piiProtectionService.generateTransparencyReport(
          sessionId,
          encryptionKey,
          await consentManager.getConsent(sessionId) || consentManager.getDefaultConsent()
        );
        
        return NextResponse.json(report);

      case 'consent':
        const consent = await consentManager.getConsent(sessionId);
        return NextResponse.json({
          consent: consent || consentManager.getDefaultConsent()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Privacy API error:', error);
    return NextResponse.json(
      { error: 'Privacy operation failed' },
      { status: 500 }
    );
  }
}

// Data Deletion API
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Delete all user data
    await piiProtectionService.deleteUserData(sessionId);
    
    // Clear consent
    await consentManager.updateConsent(
      sessionId,
      consentManager.getDefaultConsent(),
      request.headers.get('x-forwarded-for') || '127.0.0.1',
      'data-deletion'
    );

    return NextResponse.json({
      success: true,
      message: 'All data deleted successfully',
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Data deletion API error:', error);
    return NextResponse.json(
      { error: 'Data deletion failed' },
      { status: 500 }
    );
  }
}

function generateSessionId(): string {
  const crypto = require('crypto');
  return crypto.randomUUID();
}