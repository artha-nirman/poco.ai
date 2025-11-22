import '@testing-library/jest-dom'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/poco_test'

// Set up MSW server for API mocking
export const server = setupServer(
  // Mock country configurations
  http.get('/api/countries/:country/config', ({ params }) => {
    const { country } = params
    const configs = {
      AU: {
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
      },
      SG: {
        countryCode: 'SG',
        name: 'Singapore', 
        currency: 'SGD',
        regulations: {
          framework: 'Insurance Act',
          coverageCategories: {
            hospital: { mandatory: true, minimumCoverage: 'basic' }
          }
        },
        version: '1.0'
      },
      NZ: {
        countryCode: 'NZ',
        name: 'New Zealand',
        currency: 'NZD', 
        regulations: {
          framework: 'Insurance Act',
          coverageCategories: {
            hospital: { mandatory: false, minimumCoverage: 'none' }
          }
        },
        version: '1.0'
      }
    }
    
    return HttpResponse.json(configs[country as keyof typeof configs] || null)
  }),

  // Mock analysis endpoint
  http.post('/api/v2/:country/policies/analyze', async ({ params, request }) => {
    const { country } = params
    const body = await request.json()
    
    return HttpResponse.json({
      analysis_id: 'test-analysis-id',
      country: country?.toUpperCase(),
      country_name: country === 'au' ? 'Australia' : country === 'sg' ? 'Singapore' : 'New Zealand',
      policy: {
        type: body.policy_type || 'health',
        provider: 'Test Provider',
        confidence: 85,
        features: {},
        regulatory_compliance: {
          score: 90,
          level: 'standard',
          framework: 'Test Framework',
          violations: [],
          recommendations: [],
          country_requirements: []
        },
        risk_assessment: {
          overall_risk: 'low',
          risk_factors: [],
          consumer_protections: [],
          recommended_actions: []
        }
      },
      insights: {
        key_benefits: ['Comprehensive coverage', 'Competitive pricing'],
        potential_concerns: ['Limited regional coverage'],
        coverage_gaps: ['Dental not included'],
        cost_factors: ['Age loading', 'Geographic factors'],
        recommendations: ['Consider adding extras coverage']
      },
      metadata: {
        processing_time_ms: 1500,
        api_version: '2.0',
        country_config_version: '1.0',
        privacy_level: 'standard',
        pii_protection_applied: true
      }
    })
  })
)

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
})

// Close server after all tests
afterAll(() => {
  server.close()
})

// Mock fetch globally
global.fetch = jest.fn()

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  }
})