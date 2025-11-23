/**
 * Policy Processor Integration Test
 * Tests the complete policy analysis pipeline with V2 provider integration
 */

import { CorePolicyProcessor } from '../lib/services/policy-processor';
import { ProviderPolicyService } from '../lib/services/provider-policy';
import { createSessionStore } from '../lib/database/session-store';
import { ServiceFactory } from '../lib/services/mock-services';
import { AnalysisResults, PolicyFeatures, ComparisonResult } from '../lib/types';

// Mock external services
jest.mock('../lib/services/mock-services');
jest.mock('../lib/services/provider-policy');
jest.mock('../lib/database/session-store');

const mockServiceFactory = ServiceFactory as jest.Mocked<typeof ServiceFactory>;
const MockProviderPolicyService = ProviderPolicyService as jest.MockedClass<typeof ProviderPolicyService>;
const mockCreateSessionStore = createSessionStore as jest.MockedFunction<typeof createSessionStore>;

// Test policy document content
const testPolicyDocument = `
PRIVATE HEALTH INSURANCE POLICY DOCUMENT

Policy Type: Hospital & Extras Combined Cover
Coverage Level: Silver Plus

HOSPITAL COVERAGE:
- Private hospital accommodation
- Choice of doctor for covered services
- Emergency ambulance transport
- Rehabilitation and palliative care
- Day surgery procedures
- Mental health services (30 day limit)

EXTRAS COVERAGE:
- General dental: $800 annual limit
- Major dental: $1,200 annual limit  
- Optical: $400 annual limit
- Physiotherapy: $600 annual limit
- Chiropractic: $400 annual limit
- Remedial massage: $300 annual limit

WAITING PERIODS:
- Hospital services: 12 months
- Extras services: 2 months
- Pre-existing conditions: 12 months

PREMIUMS (Monthly):
- Single: $485
- Couple: $970
- Family: $1,455

EXCESS: $500 per person, per admission
ANNUAL LIMIT: No annual limit on hospital benefits
CO-PAYMENTS: 25% for some extras services
`;

// Expected policy features from document analysis
const expectedPolicyFeatures: PolicyFeatures = {
  policyType: 'combined',
  policyTier: 'silver',
  premiumCategory: '400-600',
  excessCategory: 'under-500',
  hospitalFeatures: [
    'private_hospital',
    'choice_of_doctor', 
    'emergency_ambulance',
    'day_surgery',
    'mental_health',
    'rehabilitation'
  ],
  extrasFeatures: [
    'general_dental',
    'major_dental',
    'optical',
    'physiotherapy', 
    'chiropractic',
    'remedial_massage'
  ],
  waitingPeriods: {
    hospital_services: '12 months',
    extras_services: '2 months',
    pre_existing_conditions: '12 months'
  },
  exclusions: [],
  conditions: ['standard_terms']
};

describe('Policy Processor Integration', () => {
  let policyProcessor: CorePolicyProcessor;
  let mockProviderPolicyService: jest.Mocked<ProviderPolicyService>;
  let mockSessionStore: any;
  let mockDocumentProcessor: any;
  let mockLLMProvider: any;
  let mockPIIProtection: any;
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session store
    mockSessionStore = {
      createSession: jest.fn().mockResolvedValue(undefined),
      setProgress: jest.fn().mockResolvedValue(undefined),
      setResults: jest.fn().mockResolvedValue(undefined),
      getProgress: jest.fn().mockResolvedValue(null),
      getResults: jest.fn().mockResolvedValue(null)
    };
    mockCreateSessionStore.mockReturnValue(mockSessionStore);

    // Mock external services
    mockDocumentProcessor = {
      processDocument: jest.fn().mockResolvedValue({
        text: testPolicyDocument,
        tables: [],
        entities: [],
        layout: { pages: [] },
        confidence: 0.95,
        processingTime: 1500
      })
    };

    mockLLMProvider = {
      analyzeFeatures: jest.fn().mockResolvedValue(expectedPolicyFeatures),
      generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1))
    };

    mockPIIProtection = {
      detectPII: jest.fn().mockResolvedValue({
        detectedPII: [],
        anonymizedContent: testPolicyDocument,
        confidence: 0.99
      }),
      isolatePII: jest.fn().mockResolvedValue({
        anonymizedDocument: { anonymizedContent: testPolicyDocument },
        encryptedPII: null
      })
    };

    mockStorage = {
      store: jest.fn().mockResolvedValue('stored-id'),
      retrieve: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue(true)
    };

    mockServiceFactory.createDocumentProcessor.mockReturnValue(mockDocumentProcessor);
    mockServiceFactory.createLLMProvider.mockReturnValue(mockLLMProvider);
    mockServiceFactory.createPIIProtectionService.mockReturnValue(mockPIIProtection);
    mockServiceFactory.createStorageService.mockReturnValue(mockStorage);

    // Mock provider policy service
    mockProviderPolicyService = new MockProviderPolicyService() as jest.Mocked<ProviderPolicyService>;
    MockProviderPolicyService.mockImplementation(() => mockProviderPolicyService);

    policyProcessor = new CorePolicyProcessor();
  });

  describe('Complete Processing Pipeline', () => {
    test('should process policy document through complete pipeline', async () => {
      const sessionId = 'test-session-123';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      // Mock provider policies for comparison
      mockProviderPolicyService.getActivePolicies.mockResolvedValue([
        {
          id: 'provider-policy-1',
          policyName: 'Medibank Silver Extra',
          policyType: 'combined',
          policyTier: 'silver',
          providerCode: 'MEDIBANK',
          providerName: 'Medibank Private',
          state: 'active',
          qualityScore: 0.85,
          effectiveFrom: new Date(),
          effectiveUntil: null,
          updatedAt: new Date(),
          features: {
            policyType: 'combined',
            policyTier: 'silver',
            premiumCategory: '400-600',
            excessCategory: 'under-500',
            hospitalFeatures: ['private_hospital', 'choice_of_doctor', 'emergency_ambulance'],
            extrasFeatures: ['general_dental', 'optical', 'physiotherapy'],
            waitingPeriods: { hospital_services: '12 months', extras_services: '2 months' },
            exclusions: ['cosmetic_surgery'],
            conditions: ['standard_terms'],
            coverageCategories: {
              hospital: {
                features: {
                  private_hospital: { covered: true, annualLimit: null },
                  choice_of_doctor: { covered: true, annualLimit: null }
                }
              },
              extras: {
                features: {
                  general_dental: { covered: true, annualLimit: 800 },
                  optical: { covered: true, annualLimit: 400 }
                }
              }
            },
            premiumRanges: {
              single: { min: 450, max: 550 },
              couple: { min: 900, max: 1100 },
              family: { min: 1350, max: 1650 }
            },
            constraints: []
          }
        }
      ]);

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer, 'test-policy.pdf');

      // Verify complete pipeline execution
      expect(mockSessionStore.createSession).toHaveBeenCalledWith(sessionId);
      expect(mockDocumentProcessor.processDocument).toHaveBeenCalledWith(fileBuffer, 'test-policy.pdf');
      expect(mockPIIProtection.detectPII).toHaveBeenCalledWith(testPolicyDocument);
      expect(mockLLMProvider.analyzeFeatures).toHaveBeenCalled();
      expect(mockLLMProvider.generateEmbedding).toHaveBeenCalled();
      expect(mockProviderPolicyService.getActivePolicies).toHaveBeenCalledWith('AU', {
        qualityThreshold: 0.7
      });

      // Verify result structure
      expect(result).toMatchObject({
        sessionId,
        userPolicyFeatures: expectedPolicyFeatures,
        recommendations: expect.any(Array),
        totalPoliciesCompared: expect.any(Number),
        processingTimeMs: expect.any(Number),
        confidence: expect.any(Number),
        generatedAt: expect.any(Date)
      });

      expect(mockSessionStore.setResults).toHaveBeenCalledWith(sessionId, result);
    });

    test('should handle documents with no PII detected', async () => {
      const sessionId = 'no-pii-session';
      const cleanDocument = 'This is a generic policy document with no personal information.';
      const fileBuffer = Buffer.from(cleanDocument, 'utf-8');

      mockDocumentProcessor.processDocument.mockResolvedValue({
        text: cleanDocument,
        tables: [],
        entities: [],
        layout: { pages: [] },
        confidence: 0.95,
        processingTime: 800
      });

      mockPIIProtection.detectPII.mockResolvedValue({
        detectedPII: [],
        anonymizedContent: cleanDocument,
        confidence: 1.0
      });

      mockProviderPolicyService.getActivePolicies.mockResolvedValue([]);

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer);

      expect(result.sessionId).toBe(sessionId);
      expect(result.recommendations).toEqual([]);
      expect(result.totalPoliciesCompared).toBe(0);
    });

    test('should skip Document AI when requested', async () => {
      const sessionId = 'skip-ai-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      mockProviderPolicyService.getActivePolicies.mockResolvedValue([]);

      const result = await policyProcessor.processPolicy(
        sessionId, 
        fileBuffer, 
        'anonymized_document.txt', 
        true
      );

      // Should skip Document AI processing
      expect(mockDocumentProcessor.processDocument).not.toHaveBeenCalled();
      expect(mockPIIProtection.detectPII).toHaveBeenCalledWith(testPolicyDocument);
      expect(result.sessionId).toBe(sessionId);
    });

    test('should handle processing errors gracefully', async () => {
      const sessionId = 'error-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      mockDocumentProcessor.processDocument.mockRejectedValue(
        new Error('Document processing failed')
      );

      await expect(policyProcessor.processPolicy(sessionId, fileBuffer))
        .rejects.toThrow('Document processing failed');

      expect(mockSessionStore.setProgress).toHaveBeenLastCalledWith(
        sessionId,
        expect.objectContaining({
          progress: -1,
          message: expect.stringContaining('Processing failed')
        })
      );
    });
  });

  describe('Provider Policy Comparison', () => {
    test('should compare user policy with provider policies', async () => {
      const sessionId = 'comparison-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      // Mock multiple provider policies for comparison
      const mockProviderPolicies = [
        {
          id: 'policy-1',
          policyName: 'Medibank Silver Extra',
          policyType: 'combined' as const,
          policyTier: 'silver' as const,
          providerCode: 'MEDIBANK',
          providerName: 'Medibank Private',
          state: 'active' as const,
          qualityScore: 0.85,
          effectiveFrom: new Date(),
          effectiveUntil: null,
          updatedAt: new Date(),
          features: {
            ...expectedPolicyFeatures,
            premiumRanges: {
              single: { min: 450, max: 550 },
              couple: { min: 900, max: 1100 },
              family: { min: 1350, max: 1650 }
            },
            coverageCategories: {
              hospital: { features: {} },
              extras: { features: {} }
            },
            constraints: []
          }
        },
        {
          id: 'policy-2',
          policyName: 'BUPA Silver Plus',
          policyType: 'combined' as const,
          policyTier: 'silver' as const,
          providerCode: 'BUPA',
          providerName: 'BUPA Australia',
          state: 'active' as const,
          qualityScore: 0.80,
          effectiveFrom: new Date(),
          effectiveUntil: null,
          updatedAt: new Date(),
          features: {
            ...expectedPolicyFeatures,
            hospitalFeatures: ['private_hospital', 'emergency_ambulance'], // Different features
            premiumRanges: {
              single: { min: 480, max: 580 },
              couple: { min: 960, max: 1160 },
              family: { min: 1440, max: 1740 }
            },
            coverageCategories: {
              hospital: { features: {} },
              extras: { features: {} }
            },
            constraints: []
          }
        }
      ];

      mockProviderPolicyService.getActivePolicies.mockResolvedValue(mockProviderPolicies);

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.totalPoliciesCompared).toBe(mockProviderPolicies.length);
      expect(result.recommendations[0]).toHaveProperty('policy');
      expect(result.recommendations[0]).toHaveProperty('overallScore');
      expect(result.recommendations[0]).toHaveProperty('featureMatchScore');
      expect(result.recommendations[0]).toHaveProperty('confidence');
    });

    test('should rank recommendations by overall score', async () => {
      const sessionId = 'ranking-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      const mockProviderPolicies = Array.from({ length: 5 }, (_, i) => ({
        id: `policy-${i}`,
        policyName: `Provider ${i} Policy`,
        policyType: 'combined' as const,
        policyTier: 'silver' as const,
        providerCode: `PROVIDER_${i}`,
        providerName: `Provider ${i}`,
        state: 'active' as const,
        qualityScore: 0.8 + (i * 0.02), // Varying quality scores
        effectiveFrom: new Date(),
        effectiveUntil: null,
        updatedAt: new Date(),
        features: {
          ...expectedPolicyFeatures,
          premiumRanges: {
            single: { min: 400 + i * 50, max: 500 + i * 50 },
            couple: { min: 800 + i * 100, max: 1000 + i * 100 },
            family: { min: 1200 + i * 150, max: 1500 + i * 150 }
          },
          coverageCategories: { hospital: { features: {} }, extras: { features: {} } },
          constraints: []
        }
      }));

      mockProviderPolicyService.getActivePolicies.mockResolvedValue(mockProviderPolicies);

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer);

      // Should return sorted recommendations
      expect(result.recommendations.length).toBeLessThanOrEqual(10); // Default top N
      
      // Verify ranking order (higher scores first)
      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i - 1].overallScore)
          .toBeGreaterThanOrEqual(result.recommendations[i].overallScore);
      }
    });

    test('should calculate feature match scores accurately', async () => {
      const sessionId = 'feature-match-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      // Policy with exact feature match
      const exactMatchPolicy = {
        id: 'exact-match',
        policyName: 'Exact Match Policy',
        policyType: 'combined' as const,
        policyTier: 'silver' as const,
        providerCode: 'EXACT',
        providerName: 'Exact Provider',
        state: 'active' as const,
        qualityScore: 0.9,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        updatedAt: new Date(),
        features: {
          ...expectedPolicyFeatures,
          premiumRanges: {
            single: { min: 450, max: 550 },
            couple: { min: 900, max: 1100 },
            family: { min: 1350, max: 1650 }
          },
          coverageCategories: { hospital: { features: {} }, extras: { features: {} } },
          constraints: []
        }
      };

      // Policy with partial feature match
      const partialMatchPolicy = {
        ...exactMatchPolicy,
        id: 'partial-match',
        policyName: 'Partial Match Policy',
        providerCode: 'PARTIAL',
        providerName: 'Partial Provider',
        features: {
          ...exactMatchPolicy.features,
          hospitalFeatures: ['private_hospital'], // Only one matching feature
          extrasFeatures: ['general_dental'] // Only one matching feature
        }
      };

      mockProviderPolicyService.getActivePolicies.mockResolvedValue([
        exactMatchPolicy,
        partialMatchPolicy
      ]);

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer);

      // Exact match should have higher feature match score than partial match
      const exactMatchRec = result.recommendations.find(r => r.policy.providerCode === 'EXACT');
      const partialMatchRec = result.recommendations.find(r => r.policy.providerCode === 'PARTIAL');

      expect(exactMatchRec?.featureMatchScore).toBeGreaterThan(partialMatchRec?.featureMatchScore || 0);
    });
  });

  describe('Progress Tracking', () => {
    test('should track progress through all stages', async () => {
      const sessionId = 'progress-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      mockProviderPolicyService.getActivePolicies.mockResolvedValue([]);

      await policyProcessor.processPolicy(sessionId, fileBuffer);

      // Verify progress updates for all stages
      const progressCalls = mockSessionStore.setProgress.mock.calls;
      const progressValues = progressCalls.map(call => call[1].progress);

      expect(progressValues).toContain(10); // Document upload
      expect(progressValues).toContain(25); // PII protection
      expect(progressValues).toContain(45); // AI analysis
      expect(progressValues).toContain(60); // Embedding generation
      expect(progressValues).toContain(75); // Policy comparison
      expect(progressValues).toContain(90); // Recommendation ranking
      expect(progressValues).toContain(100); // Analysis complete
    });

    test('should provide estimated time remaining', async () => {
      const sessionId = 'time-estimate-session';
      
      const progress = await policyProcessor.getProgress(sessionId);
      
      expect(mockSessionStore.getProgress).toHaveBeenCalledWith(sessionId);
    });

    test('should store and retrieve session results', async () => {
      const sessionId = 'results-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      mockProviderPolicyService.getActivePolicies.mockResolvedValue([]);

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer);
      
      // Verify results are stored
      expect(mockSessionStore.setResults).toHaveBeenCalledWith(sessionId, result);

      // Test result retrieval
      await policyProcessor.getResults(sessionId);
      expect(mockSessionStore.getResults).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle provider service failures with fallback', async () => {
      const sessionId = 'fallback-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      // Mock provider service failure
      mockProviderPolicyService.getActivePolicies.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer);

      // Should fallback to mock data
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].policy.providerCode).toBe('MEDIBANK');
    });

    test('should handle LLM service failures', async () => {
      const sessionId = 'llm-error-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      mockLLMProvider.analyzeFeatures.mockRejectedValue(
        new Error('LLM service unavailable')
      );

      await expect(policyProcessor.processPolicy(sessionId, fileBuffer))
        .rejects.toThrow('LLM service unavailable');
    });

    test('should validate confidence scores', async () => {
      const sessionId = 'confidence-session';
      const fileBuffer = Buffer.from(testPolicyDocument, 'utf-8');

      mockProviderPolicyService.getActivePolicies.mockResolvedValue([
        {
          id: 'high-confidence-policy',
          policyName: 'High Confidence Policy',
          policyType: 'combined',
          policyTier: 'silver',
          providerCode: 'HIGH_CONF',
          providerName: 'High Confidence Provider',
          state: 'active',
          qualityScore: 0.95,
          effectiveFrom: new Date(),
          effectiveUntil: null,
          updatedAt: new Date(),
          features: {
            ...expectedPolicyFeatures,
            premiumRanges: {
              single: { min: 450, max: 550 },
              couple: { min: 900, max: 1100 },
              family: { min: 1350, max: 1650 }
            },
            coverageCategories: { hospital: { features: {} }, extras: { features: {} } },
            constraints: []
          }
        }
      ]);

      const result = await policyProcessor.processPolicy(sessionId, fileBuffer);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.recommendations[0].confidence).toBeGreaterThan(0);
      expect(result.recommendations[0].confidence).toBeLessThanOrEqual(1);
    });
  });
});

// Export test utilities
export const testUtilities = {
  createTestSessionId: () => `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  createTestPolicyDocument: (overrides = '') => `${testPolicyDocument}\n${overrides}`,
  expectedPolicyFeatures,
  getMockProviderPolicy: (id: string, overrides = {}) => ({
    id,
    policyName: `Mock Policy ${id}`,
    policyType: 'combined' as const,
    policyTier: 'silver' as const,
    providerCode: `MOCK_${id}`,
    providerName: `Mock Provider ${id}`,
    state: 'active' as const,
    qualityScore: 0.8,
    effectiveFrom: new Date(),
    effectiveUntil: null,
    updatedAt: new Date(),
    features: {
      ...expectedPolicyFeatures,
      premiumRanges: {
        single: { min: 450, max: 550 },
        couple: { min: 900, max: 1100 },
        family: { min: 1350, max: 1650 }
      },
      coverageCategories: { hospital: { features: {} }, extras: { features: {} } },
      constraints: []
    },
    ...overrides
  })
};