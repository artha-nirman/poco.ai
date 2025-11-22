import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v2/au/policies/analyze/route'
import { V2AnalysisResponse } from '@/lib/types/v2'

// Mock the policy processor
jest.mock('@/lib/services/policy-processor', () => ({
  analyzePolicy: jest.fn()
}))

// Mock the session store
jest.mock('@/lib/database/v2-session-store', () => ({
  V2SessionStore: jest.fn().mockImplementation(() => ({
    createSession: jest.fn(),
    storeAnalysis: jest.fn()
  }))
}))

describe('/api/v2/au/policies/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST Request', () => {
    it('should analyze policy and return results', async () => {
      const { analyzePolicy } = await import('@/lib/services/policy-processor')
      const mockAnalyzePolicy = jest.mocked(analyzePolicy)
      
      const mockResult: V2AnalysisResponse = {
        analysis_id: 'test-analysis-123',
        country: 'AU',
        country_name: 'Australia',
        policy: {
          type: 'health',
          confidence: 85,
          regulatory_compliance: {
            score: 90,
            framework: 'Private Health Insurance Act 2007',
            compliant_areas: ['Coverage requirements', 'Disclosure standards'],
            non_compliant_areas: []
          },
          risk_assessment: {
            overall_risk: 'low',
            risk_factors: [],
            mitigation_recommendations: []
          }
        },
        insights: {
          key_benefits: ['Comprehensive hospital coverage', 'No excess for preferred providers'],
          potential_concerns: ['Limited overseas coverage'],
          recommendations: ['Consider adding extras coverage', 'Review overseas travel options']
        },
        metadata: {
          processing_time_ms: 1500,
          api_version: '2.0',
          country_config_version: '1.0',
          privacy_level: 'standard',
          pii_protection_applied: true
        }
      }

      mockAnalyzePolicy.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_text: 'Test policy document for health insurance coverage...',
          user_preferences: {
            privacy_level: 'standard',
            analysis_depth: 'standard',
            include_comparison: true,
            highlight_concerns: true
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis_id).toBe('test-analysis-123')
      expect(data.country).toBe('AU')
      expect(data.policy.type).toBe('health')
      expect(data.policy.confidence).toBe(85)
      expect(data.insights.key_benefits).toContain('Comprehensive hospital coverage')
      expect(mockAnalyzePolicy).toHaveBeenCalledWith(
        'Test policy document for health insurance coverage...',
        'AU',
        expect.objectContaining({
          privacy_level: 'standard',
          analysis_depth: 'standard'
        })
      )
    })

    it('should return 400 for missing policy_text', async () => {
      const request = new NextRequest('http://localhost:3000/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_preferences: {
            privacy_level: 'standard'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.message).toContain('policy_text is required')
    })

    it('should return 400 for empty policy_text', async () => {
      const request = new NextRequest('http://localhost:3000/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_text: '',
          user_preferences: {
            privacy_level: 'standard'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.message).toContain('policy_text cannot be empty')
    })

    it('should use default user preferences when not provided', async () => {
      const { analyzePolicy } = await import('@/lib/services/policy-processor')
      const mockAnalyzePolicy = jest.mocked(analyzePolicy)
      
      const mockResult: V2AnalysisResponse = {
        analysis_id: 'test-analysis-456',
        country: 'AU',
        country_name: 'Australia',
        policy: {
          type: 'health',
          confidence: 75,
          regulatory_compliance: { score: 85 },
          risk_assessment: { overall_risk: 'medium' }
        },
        insights: {
          key_benefits: ['Basic coverage'],
          potential_concerns: ['High excess'],
          recommendations: ['Review coverage options']
        },
        metadata: {
          processing_time_ms: 1200,
          api_version: '2.0',
          country_config_version: '1.0',
          privacy_level: 'standard',
          pii_protection_applied: true
        }
      }

      mockAnalyzePolicy.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_text: 'Basic policy text'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockAnalyzePolicy).toHaveBeenCalledWith(
        'Basic policy text',
        'AU',
        expect.objectContaining({
          privacy_level: 'standard',
          analysis_depth: 'standard',
          include_comparison: true,
          highlight_concerns: true
        })
      )
    })

    it('should handle analysis service errors', async () => {
      const { analyzePolicy } = await import('@/lib/services/policy-processor')
      const mockAnalyzePolicy = jest.mocked(analyzePolicy)
      
      mockAnalyzePolicy.mockRejectedValue(new Error('Analysis service unavailable'))

      const request = new NextRequest('http://localhost:3000/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_text: 'Test policy text',
          user_preferences: {
            privacy_level: 'standard'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Analysis failed')
      expect(data.message).toContain('Analysis service unavailable')
    })

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.message).toContain('Invalid JSON')
    })

    it('should validate user preferences', async () => {
      const { analyzePolicy } = await import('@/lib/services/policy-processor')
      const mockAnalyzePolicy = jest.mocked(analyzePolicy)
      
      const mockResult: V2AnalysisResponse = {
        analysis_id: 'test-analysis-789',
        country: 'AU',
        country_name: 'Australia',
        policy: {
          type: 'health',
          confidence: 80,
          regulatory_compliance: { score: 88 },
          risk_assessment: { overall_risk: 'low' }
        },
        insights: {
          key_benefits: ['Good coverage'],
          potential_concerns: [],
          recommendations: ['Continue monitoring']
        },
        metadata: {
          processing_time_ms: 1300,
          api_version: '2.0',
          country_config_version: '1.0',
          privacy_level: 'high',
          pii_protection_applied: true
        }
      }

      mockAnalyzePolicy.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_text: 'Policy text with high privacy requirements',
          user_preferences: {
            privacy_level: 'high',
            analysis_depth: 'detailed',
            include_comparison: false,
            highlight_concerns: false
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.privacy_level).toBe('high')
      expect(mockAnalyzePolicy).toHaveBeenCalledWith(
        'Policy text with high privacy requirements',
        'AU',
        expect.objectContaining({
          privacy_level: 'high',
          analysis_depth: 'detailed',
          include_comparison: false,
          highlight_concerns: false
        })
      )
    })
  })
})