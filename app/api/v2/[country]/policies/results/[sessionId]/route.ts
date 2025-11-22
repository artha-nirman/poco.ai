/**
 * V2 Country-Aware Policy Results Route
 * Retrieve completed analysis with country-specific formatting
 * 
 * URL: /api/v2/{country}/policies/results/{sessionId}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSessionStore } from '@/lib/database/session-store'
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
    
    // Get results from session store
    const sessionStore = createSessionStore()
    const results = await sessionStore.getResults(sessionId)
    
    if (!results) {
      // Check if session exists but not completed
      const progress = await sessionStore.getProgress(sessionId)
      if (progress) {
        return NextResponse.json(
          {
            error: 'Analysis not complete',
            message: 'Policy analysis is still in progress',
            current_status: progress.stage,
            progress_percentage: progress.progress,
            progress_endpoint: `/api/v2/${country.toLowerCase()}/policies/progress/${sessionId}`
          },
          { status: 202 } // Accepted but not ready
        )
      }
      
      return NextResponse.json(
        {
          error: 'Results not found',
          message: `No completed analysis found for session: ${sessionId}`
        },
        { status: 404 }
      )
    }
    
    // Convert to V2 format with country context
    const v2Results = {
      session_id: sessionId,
      country_code: countryCode,
      country_name: countryConfig.countryName,
      analysis_metadata: {
        analyzed_at: results.generatedAt.toISOString(),
        confidence_score: results.confidence,
        processing_time_ms: results.processingTimeMs,
        ai_model_used: 'gemini-1.5-pro'
      },
      user_policy: {
        detected_type: results.userPolicyFeatures.policyType,
        detected_tier: results.userPolicyFeatures.policyTier,
        features: results.userPolicyFeatures,
        currency: countryConfig.currency
      },
      recommendations: results.recommendations.map((rec, index) => ({
        rank: index + 1,
        provider: {
          name: rec.policy?.providerName || 'Unknown Provider',
          tier: rec.policy?.policyTier || 'unknown'
        },
        policy: {
          name: rec.policy?.policyName || 'Unknown Policy',
          type: rec.policy?.policyType || 'unknown'
        },
        score: {
          overall: rec.overallScore,
          cost: rec.costEfficiencyScore,
          coverage: rec.featureMatchScore,
          provider_reputation: 0.8 // Default value
        },
        reasoning: rec.reasoning,
        improvements: rec.coverageImprovements,
        potential_drawbacks: rec.potentialDrawbacks
      })),
      summary: {
        total_compared: results.totalPoliciesCompared,
        recommendation_count: results.recommendations.length,
        analysis_confidence: results.confidence,
        best_overall_recommendation: results.recommendations.length > 0 ? 0 : null
      },
      metadata: {
        processing_time_ms: results.processingTimeMs,
        api_version: '2.0',
        country_config: countryConfig
      }
    }
    
    return NextResponse.json(v2Results, {
      headers: {
        'x-poco-session-id': sessionId,
        'x-poco-country': countryCode,
        'x-poco-api-version': '2.0',
        'cache-control': 'public, max-age=3600' // Cache for 1 hour
      }
    })
    
  } catch (error) {
    console.error('Results retrieval error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve analysis results'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET to retrieve results' },
    { status: 405 }
  )
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use GET to retrieve results' },
    { status: 405 }
  )
}