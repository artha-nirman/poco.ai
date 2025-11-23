/**
 * V2 Country-Aware Policy Analyzer Route
 * Smart endpoint that adapts processing based on country configuration
 * 
 * URL: /api/v2/{country}/policies/analyze
 */

import { NextRequest, NextResponse } from 'next/server'
import { CorePolicyProcessor } from '@/lib/services/policy-processor'
import { PROCESSING_CONFIG } from '@/lib/constants'
import { loadCountryConfig } from '@/lib/config/country-loader'

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
    let sessionId = `v2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const processor = CorePolicyProcessor.getInstance()
    
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

      // Create session and start processing
      const fileContent = await file.arrayBuffer()
      
      // Start processing in background (this will create the session)
      const skipDocumentAI = file.type === 'text/plain';
      processor.processPolicy(
        sessionId,
        Buffer.from(fileContent),
        file.name,
        skipDocumentAI // Skip Document AI for text files, use it for PDFs/images
      ).catch((error) => {
        console.error(`V2 processing failed for session ${sessionId}:`, error)
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

      // Create session and start processing for text input
      
      // Start processing in background (this will create the session)
      processor.processPolicy(
        sessionId,
        Buffer.from(policyText, 'utf-8'),
        'text_input.txt',
        true // Skip Document AI for text content
      ).catch((error) => {
        console.error(`V2 processing failed for session ${sessionId}:`, error)
      })
    }

    return NextResponse.json({
      session_id: sessionId,
      status: 'processing',
      country: countryConfig.countryName,
      progress_url: `/api/v2/${country.toLowerCase()}/policies/progress/${sessionId}`,
      results_url: `/api/v2/${country.toLowerCase()}/policies/results/${sessionId}`,
      message: `Analysis started for ${countryConfig.countryName}`,
      estimated_time: '2-3 minutes'
    }, { status: 202 })
    
  } catch (error) {
    console.error('V2 Policy analysis error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during policy analysis'
      },
      { status: 500 }
    )
  }
}

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