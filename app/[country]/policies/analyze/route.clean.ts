/**
 * Direct Country-Level Policy Analyzer Route
 * Clean URL endpoint that implements V2 functionality directly
 * 
 * URL: /{country}/policies/analyze
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadCountryConfig } from '@/lib/config/country-loader'
import { CorePolicyProcessor } from '@/lib/services/policy-processor'

// Simple input validation
function validateAnalysisRequest(body: any): { success: boolean; data?: any; errors?: any[] } {
  if (!body.policy_text || typeof body.policy_text !== 'string' || body.policy_text.trim().length === 0) {
    return { success: false, errors: [{ message: "Policy text is required" }] }
  }
  
  return { 
    success: true, 
    data: {
      policy_text: body.policy_text,
      policy_type: body.policy_type,
      provider_name: body.provider_name,
      user_preferences: body.user_preferences || {}
    }
  }
}

/**
 * POST endpoint for policy analysis with clean URLs
 */
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

    // Handle both FormData (file uploads) and JSON (text) requests
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('policy') as File
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain']
      if (!supportedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
      }

      // Create session and process in background
      const processor = new CorePolicyProcessor()
      const fileContent = await file.arrayBuffer()
      
      // Start background processing
      setImmediate(async () => {
        try {
          await processor.createSession(sessionId, file.name)
          await processor.processPolicy(
            sessionId, 
            Buffer.from(fileContent), 
            file.name,
            false // Use Document AI for files
          )
        } catch (error) {
          console.error('Background processing error:', error)
        }
      })
      
      // Return session info for polling
      return NextResponse.json({
        session_id: sessionId,
        status: 'processing',
        country: countryConfig.countryName,
        progress_url: `/${country.toLowerCase()}/policies/progress/${sessionId}`,
        results_url: `/${country.toLowerCase()}/policies/results/${sessionId}`,
        message: `Analysis started for ${countryConfig.countryName}`,
        estimated_time: '2-3 minutes'
      }, { status: 202 })

    } else {
      // Handle JSON input
      const body = await request.json()
      const validation = validateAnalysisRequest(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.errors },
          { status: 400 }
        )
      }
      
      // Create session and process in background
      const processor = new CorePolicyProcessor()
      const analysisData = validation.data
      
      // Start background processing
      setImmediate(async () => {
        try {
          await processor.createSession(sessionId, 'policy_text.txt')
          await processor.processPolicy(
            sessionId, 
            Buffer.from(analysisData.policy_text, 'utf-8'), 
            'policy_text.txt',
            true // Skip Document AI for text input
          )
        } catch (error) {
          console.error('Background processing error:', error)
        }
      })
      
      // Return session info for polling
      return NextResponse.json({
        session_id: sessionId,
        status: 'processing',
        country: countryConfig.countryName,
        progress_url: `/${country.toLowerCase()}/policies/progress/${sessionId}`,
        results_url: `/${country.toLowerCase()}/policies/results/${sessionId}`,
        message: `Analysis started for ${countryConfig.countryName}`,
        estimated_time: '1-2 minutes'
      }, { status: 202 })
    }
    
  } catch (error) {
    console.error('Analysis error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during policy analysis'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint returns method not allowed
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to analyze policies' },
    { status: 405 }
  )
}