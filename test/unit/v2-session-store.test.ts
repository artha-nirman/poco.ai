import { V2SessionStore } from '@/lib/database/v2-session-store'
import type { V2AnalysisResponse, V2SessionData, CountryConfiguration } from '@/lib/types/v2'

// Mock PostgreSQL client
const mockQuery = jest.fn()
const mockClient = {
  query: mockQuery,
  release: jest.fn()
}

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: mockQuery
}

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}))

describe('V2SessionStore', () => {
  let sessionStore: V2SessionStore
  
  const mockCountryConfig: CountryConfiguration = {
    countryCode: 'AU',
    name: 'Australia',
    currency: 'AUD',
    regulations: {
      framework: 'Private Health Insurance Act 2007',
      coverageCategories: {
        hospital: { mandatory: true, minimumCoverage: 'basic' },
        extras: { mandatory: false, minimumCoverage: 'none' }
      }
    },
    version: '1.0'
  }

  const mockAnalysisResponse: V2AnalysisResponse = {
    analysis_id: 'test-analysis-123',
    country: 'AU',
    country_name: 'Australia',
    policy: {
      type: 'health',
      confidence: 85,
      regulatory_compliance: {
        score: 90,
        framework: 'Private Health Insurance Act 2007',
        compliant_areas: ['Coverage requirements'],
        non_compliant_areas: []
      },
      risk_assessment: {
        overall_risk: 'low',
        risk_factors: [],
        mitigation_recommendations: []
      }
    },
    insights: {
      key_benefits: ['Comprehensive coverage'],
      potential_concerns: ['High excess'],
      recommendations: ['Consider extras coverage']
    },
    metadata: {
      processing_time_ms: 1500,
      api_version: '2.0',
      country_config_version: '1.0',
      privacy_level: 'standard',
      pii_protection_applied: true
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    sessionStore = new V2SessionStore()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Database Operations', () => {
    describe('createSession', () => {
      it('should create a new session with country configuration', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            session_id: 'session-123',
            country_code: 'AU',
            created_at: new Date(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }]
        })

        const sessionData = await sessionStore.createSession('AU', mockCountryConfig)

        expect(sessionData.sessionId).toBe('session-123')
        expect(sessionData.countryCode).toBe('AU')
        expect(sessionData.countryConfiguration).toEqual(mockCountryConfig)
        
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO v2_user_sessions'),
          expect.arrayContaining(['AU', expect.any(Object)])
        )
      })

      it('should handle database errors gracefully', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database connection failed'))

        await expect(sessionStore.createSession('AU', mockCountryConfig))
          .rejects.toThrow('Failed to create session')
      })
    })

    describe('getSession', () => {
      it('should retrieve existing session', async () => {
        const mockSession = {
          session_id: 'session-123',
          country_code: 'AU',
          country_config: mockCountryConfig,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          metadata: { total_analyses: 1 }
        }

        mockQuery.mockResolvedValueOnce({
          rows: [mockSession]
        })

        const sessionData = await sessionStore.getSession('session-123')

        expect(sessionData).toBeDefined()
        expect(sessionData?.sessionId).toBe('session-123')
        expect(sessionData?.countryCode).toBe('AU')
        expect(sessionData?.countryConfiguration).toEqual(mockCountryConfig)
      })

      it('should return null for non-existent session', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: []
        })

        const sessionData = await sessionStore.getSession('non-existent')

        expect(sessionData).toBeNull()
      })

      it('should return null for expired session', async () => {
        const expiredSession = {
          session_id: 'session-expired',
          country_code: 'AU',
          country_config: mockCountryConfig,
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000),
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
          metadata: { total_analyses: 1 }
        }

        mockQuery.mockResolvedValueOnce({
          rows: [expiredSession]
        })

        const sessionData = await sessionStore.getSession('session-expired')

        expect(sessionData).toBeNull()
      })
    })

    describe('storeAnalysis', () => {
      it('should store analysis results', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 1,
            analysis_id: 'test-analysis-123',
            session_id: 'session-123'
          }]
        })

        await sessionStore.storeAnalysis('session-123', mockAnalysisResponse)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO v2_policy_analyses'),
          expect.arrayContaining([
            'test-analysis-123',
            'session-123',
            'AU',
            expect.any(Object), // policy data
            expect.any(Object), // insights data
            expect.any(Object)  // metadata
          ])
        )
      })

      it('should update session metadata after storing analysis', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT analysis
          .mockResolvedValueOnce({ rows: [] }) // UPDATE session

        await sessionStore.storeAnalysis('session-123', mockAnalysisResponse)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE v2_user_sessions'),
          expect.arrayContaining(['session-123'])
        )
      })
    })

    describe('getAnalysis', () => {
      it('should retrieve analysis by ID', async () => {
        const mockAnalysisRow = {
          analysis_id: 'test-analysis-123',
          session_id: 'session-123',
          country_code: 'AU',
          policy_data: mockAnalysisResponse.policy,
          insights_data: mockAnalysisResponse.insights,
          metadata: mockAnalysisResponse.metadata,
          created_at: new Date()
        }

        mockQuery.mockResolvedValueOnce({
          rows: [mockAnalysisRow]
        })

        const analysis = await sessionStore.getAnalysis('test-analysis-123')

        expect(analysis).toBeDefined()
        expect(analysis?.analysis_id).toBe('test-analysis-123')
        expect(analysis?.country).toBe('AU')
        expect(analysis?.policy).toEqual(mockAnalysisResponse.policy)
      })

      it('should return null for non-existent analysis', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: []
        })

        const analysis = await sessionStore.getAnalysis('non-existent')

        expect(analysis).toBeNull()
      })
    })

    describe('getSessionAnalyses', () => {
      it('should retrieve all analyses for a session', async () => {
        const mockAnalyses = [
          {
            analysis_id: 'analysis-1',
            session_id: 'session-123',
            country_code: 'AU',
            policy_data: { type: 'health', confidence: 85 },
            insights_data: { key_benefits: ['Good coverage'] },
            metadata: { processing_time_ms: 1500 },
            created_at: new Date()
          },
          {
            analysis_id: 'analysis-2',
            session_id: 'session-123',
            country_code: 'AU',
            policy_data: { type: 'auto', confidence: 78 },
            insights_data: { key_benefits: ['Comprehensive'] },
            metadata: { processing_time_ms: 1200 },
            created_at: new Date()
          }
        ]

        mockQuery.mockResolvedValueOnce({
          rows: mockAnalyses
        })

        const analyses = await sessionStore.getSessionAnalyses('session-123')

        expect(analyses).toHaveLength(2)
        expect(analyses[0].analysis_id).toBe('analysis-1')
        expect(analyses[1].analysis_id).toBe('analysis-2')
      })

      it('should return empty array for session with no analyses', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: []
        })

        const analyses = await sessionStore.getSessionAnalyses('session-123')

        expect(analyses).toEqual([])
      })
    })
  })

  describe('Memory Fallback', () => {
    it('should use in-memory storage when database is unavailable', async () => {
      // Simulate database connection failure
      mockPool.connect.mockRejectedValue(new Error('Database unavailable'))
      
      const sessionData = await sessionStore.createSession('AU', mockCountryConfig)
      
      expect(sessionData.sessionId).toBeDefined()
      expect(sessionData.countryCode).toBe('AU')
      expect(sessionData.countryConfiguration).toEqual(mockCountryConfig)
    })

    it('should store and retrieve from memory when database fails', async () => {
      // Simulate database failure
      mockPool.connect.mockRejectedValue(new Error('Database unavailable'))
      
      // Create session in memory
      const sessionData = await sessionStore.createSession('AU', mockCountryConfig)
      const sessionId = sessionData.sessionId
      
      // Store analysis in memory
      await sessionStore.storeAnalysis(sessionId, mockAnalysisResponse)
      
      // Retrieve from memory
      const retrievedSession = await sessionStore.getSession(sessionId)
      const retrievedAnalysis = await sessionStore.getAnalysis('test-analysis-123')
      
      expect(retrievedSession).toBeDefined()
      expect(retrievedSession?.sessionId).toBe(sessionId)
      expect(retrievedAnalysis).toBeDefined()
      expect(retrievedAnalysis?.analysis_id).toBe('test-analysis-123')
    })
  })

  describe('Data Validation', () => {
    it('should validate country configuration structure', async () => {
      const invalidConfig = {
        countryCode: 'AU',
        // Missing required fields
      } as any

      mockQuery.mockResolvedValueOnce({
        rows: [{
          session_id: 'session-123',
          country_code: 'AU',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }]
      })

      await expect(sessionStore.createSession('AU', invalidConfig))
        .rejects.toThrow()
    })

    it('should validate analysis response structure', async () => {
      const invalidAnalysis = {
        analysis_id: 'invalid',
        // Missing required fields
      } as any

      mockQuery.mockResolvedValueOnce({
        rows: [{
          session_id: 'session-123',
          country_code: 'AU',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }]
      })

      await expect(sessionStore.storeAnalysis('session-123', invalidAnalysis))
        .rejects.toThrow()
    })
  })
})