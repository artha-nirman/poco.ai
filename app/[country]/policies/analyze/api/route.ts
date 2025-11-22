import { NextRequest, NextResponse } from 'next/server'
import { V2DatabaseSessionStore } from '@/lib/database/v2-session-store'
import { loadCountryConfig } from '@/lib/config/country-loader'
import { CorePolicyProcessor } from '@/lib/services/policy-processor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> }
): Promise<NextResponse> {
  try {
    const { country: countryParam } = await params
    const country = countryParam.toUpperCase()
    
    // Validate country support
    let countryConfig
    try {
      countryConfig = await loadCountryConfig(country)
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Unsupported country',
          message: `Country ${country} is not currently supported`,
          supported_countries: ['AU', 'SG', 'NZ']
        },
        { status: 400 }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    let sessionId = `clean_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const sessionStore = new V2DatabaseSessionStore()
    
    // Handle both FormData (file uploads) and JSON (text) requests
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('policy') as File
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }

      const supportedTypes = [
        'application/pdf',
        'image/png', 
        'image/jpeg',
        'text/plain'
      ]

      if (!supportedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type' },
          { status: 400 }
        )
      }

      // Create V2 session for file upload
      await sessionStore.createSession(sessionId, country, {
        policy_text: `[FILE: ${file.name}]`,
        policy_type: 'health',
        user_preferences: {
          privacy_level: 'standard',
          analysis_depth: 'standard',
          include_comparison: true,
          highlight_concerns: true
        },
        request_metadata: {
          timestamp: new Date().toISOString(),
          session_id: sessionId
        }
      })
      
      // Start real processing with CorePolicyProcessor
      const processor = CorePolicyProcessor.getInstance()
      await processor.createSession(sessionId, file.name)
      
      const buffer = Buffer.from(await file.arrayBuffer())
      processor.processPolicy(sessionId, buffer).catch((error: any) => {
        console.error(`❌ V2 Processing failed for session ${sessionId}:`, error)
      })
      
    } else {
      const body = await request.json()
      const policyText = body.policy_text

      if (!policyText?.trim()) {
        return NextResponse.json(
          { error: 'Policy text is required' },
          { status: 400 }
        )
      }

      // Create V2 session for text input
      await sessionStore.createSession(sessionId, country, {
        policy_text: policyText,
        policy_type: 'health',
        user_preferences: {
          privacy_level: 'standard',
          analysis_depth: 'standard',
          include_comparison: true,
          highlight_concerns: true
        },
        request_metadata: {
          timestamp: new Date().toISOString(),
          session_id: sessionId
        }
      })
      
      // Start real processing with CorePolicyProcessor  
      const processor = CorePolicyProcessor.getInstance()
      await processor.createSession(sessionId)
      
      const buffer = Buffer.from(policyText, 'utf8')
      processor.processPolicy(sessionId, buffer).catch((error: any) => {
        console.error(`❌ V2 Processing failed for session ${sessionId}:`, error)
      })
    }

    return NextResponse.json({
      session_id: sessionId,
      status: 'processing',
      country: countryConfig.countryName,
      progress_url: `/${country.toLowerCase()}/policies/progress/${sessionId}`,
      results_url: `/${country.toLowerCase()}/policies/results/${sessionId}`,
      message: `Analysis started for ${countryConfig.countryName}`,
      estimated_time: '2-3 minutes'
    }, { status: 202 })
    
  } catch (error) {
    console.error('Clean URL Policy analysis error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during policy analysis'
      },
      { status: 500 }
    )
  }
}

// V2 now uses real CorePolicyProcessor - no simulation needed

// Handle unsupported methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to analyze policies' },
    { status: 405 }
  )
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to analyze policies' },
    { status: 405 }
  )
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to analyze policies' },
    { status: 405 }
  )
}