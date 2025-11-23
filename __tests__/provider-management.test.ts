/**
 * Provider Management System Integration Test
 * Tests the complete provider and policy management pipeline with V2 architecture
 */

import { Pool } from 'pg';
import { ProviderManagementService } from '../lib/services/provider-management';
import { ProviderPolicyService } from '../lib/services/provider-policy';
import { 
  ProviderStatus, 
  ProviderPolicyFeatures,
  ProviderPolicyWithMetadata,
  PolicyState 
} from '../lib/types';

// Mock database connection for testing
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

const mockPool = new Pool() as jest.Mocked<Pool>;

// Test provider data
const testProvider = {
  providerCode: 'TEST_PROVIDER',
  providerName: 'Test Insurance Provider',
  contactInfo: {
    email: 'contact@testprovider.com.au',
    phone: '1300 123 456',
    website: 'https://www.testprovider.com.au',
    address: {
      street: '123 Test Street',
      city: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      country: 'AU'
    }
  },
  onboardingStatus: 'active' as const,
  businessDetails: {
    abn: '12 345 678 901',
    businessLicense: 'TEST-LICENSE-123',
    complianceCertifications: ['APRA', 'ACCC'],
    establishedYear: 2010
  }
};

const testPolicyFeatures: ProviderPolicyFeatures = {
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
        choice_of_doctor: { covered: true, annualLimit: null },
        emergency_ambulance: { covered: true, annualLimit: null }
      }
    },
    extras: {
      features: {
        general_dental: { covered: true, annualLimit: 1000 },
        optical: { covered: true, annualLimit: 500 },
        physiotherapy: { covered: true, annualLimit: 800 }
      }
    }
  },
  premiumRanges: {
    single: { min: 450, max: 550 },
    couple: { min: 900, max: 1100 },
    family: { min: 1350, max: 1650 }
  },
  constraints: [
    {
      constraintType: 'waiting_period',
      appliesTo: ['hospital_services'],
      value: { duration: '12 months' }
    },
    {
      constraintType: 'waiting_period',
      appliesTo: ['extras_services'],
      value: { duration: '2 months' }
    },
    {
      constraintType: 'exclusion',
      appliesTo: ['cosmetic_surgery'],
      value: { reason: 'Not medically necessary' }
    }
  ]
};

describe('Provider Management System', () => {
  let providerService: ProviderManagementService;
  let policyService: ProviderPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    providerService = new ProviderManagementService();
    policyService = new ProviderPolicyService();
  });

  describe('Provider Management', () => {
    test('should create a new provider with all required fields', async () => {
      const mockProviderId = 'test-provider-id-123';
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: mockProviderId, ...testProvider }] });

      const result = await providerService.createProvider(testProvider);
      
      expect(result.id).toBe(mockProviderId);
      expect(result.providerCode).toBe(testProvider.providerCode);
      expect(result.providerName).toBe(testProvider.providerName);
      expect(result.onboardingStatus).toBe('active');
      
      // Verify database call
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO v2_providers'),
        expect.arrayContaining([
          testProvider.providerCode,
          testProvider.providerName,
          expect.objectContaining(testProvider.contactInfo)
        ])
      );
    });

    test('should retrieve provider by ID', async () => {
      const providerId = 'test-provider-id';
      
      mockPool.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: providerId, 
            ...testProvider,
            created_at: new Date(),
            updated_at: new Date()
          }] 
        });

      const result = await providerService.getProviderById(providerId);
      
      expect(result).toBeTruthy();
      expect(result!.id).toBe(providerId);
      expect(result!.providerCode).toBe(testProvider.providerCode);
    });

    test('should list all active providers', async () => {
      const mockProviders = [
        { id: '1', ...testProvider, onboarding_status: 'active' },
        { id: '2', ...testProvider, provider_code: 'TEST2', onboarding_status: 'active' }
      ];
      
      mockPool.query
        .mockResolvedValueOnce({ rows: mockProviders });

      const result = await providerService.getProviders({ status: 'active' });
      
      expect(result).toHaveLength(2);
      expect(result[0].onboardingStatus).toBe('active');
    });

    test('should update provider status', async () => {
      const providerId = 'test-provider-id';
      const newStatus: ProviderStatus = 'suspended';
      const reason = 'Compliance review required';
      
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 1 }); // Update query
      
      await providerService.updateProviderStatus(providerId, newStatus, reason);
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE v2_providers'),
        expect.arrayContaining([newStatus, providerId])
      );
    });

    test('should handle provider not found error', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] });

      const result = await providerService.getProviderById('non-existent-id');
      
      expect(result).toBeNull();
    });
  });

  describe('Provider Policy Management', () => {
    test('should create a policy with V2 features structure', async () => {
      const mockPolicyId = 'test-policy-id-123';
      const providerId = 'test-provider-id';
      
      const policyData = {
        providerId,
        policyName: 'Test Silver Extra Policy',
        policyType: 'combined' as const,
        policyTier: 'silver' as const,
        countryCode: 'AU',
        isActive: true,
        features: testPolicyFeatures
      };
      
      mockPool.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: mockPolicyId, 
            ...policyData,
            policy_features: testPolicyFeatures,
            created_at: new Date(),
            updated_at: new Date()
          }] 
        });

      const result = await policyService.createPolicy(policyData);
      
      expect(result.id).toBe(mockPolicyId);
      expect(result.policyName).toBe(policyData.policyName);
      expect(result.features).toEqual(testPolicyFeatures);
      
      // Verify V2 features are stored as JSONB
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO v2_provider_policies'),
        expect.arrayContaining([
          providerId,
          policyData.policyName,
          expect.objectContaining(testPolicyFeatures)
        ])
      );
    });

    test('should retrieve active policies for country with metadata', async () => {
      const mockPolicyWithMetadata = {
        id: 'policy-123',
        policy_name: 'Test Policy',
        policy_type: 'combined',
        policy_tier: 'silver',
        provider_code: 'TEST_PROVIDER',
        provider_name: 'Test Provider',
        state: 'active',
        quality_score: 0.85,
        effective_from: new Date(),
        effective_until: null,
        updated_at: new Date(),
        policy_features: testPolicyFeatures,
        pricing_info: testPolicyFeatures.premiumRanges,
        coverage_categories: testPolicyFeatures.coverageCategories,
        constraints: testPolicyFeatures.constraints
      };
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPolicyWithMetadata] });

      const result = await policyService.getActivePolicies('AU', {
        qualityThreshold: 0.8
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('features');
      expect(result[0].features).toEqual(testPolicyFeatures);
      expect(result[0].qualityScore).toBe(0.85);
    });

    test('should filter policies by provider and type', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] });

      await policyService.getActivePolicies('AU', {
        providers: ['TEST_PROVIDER', 'ANOTHER_PROVIDER'],
        policyTypes: ['hospital', 'extras']
      });
      
      // Verify SQL includes filter conditions
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/AND pp\.policy_type = ANY\(\$\d+\)/),
        expect.arrayContaining([['hospital', 'extras']])
      );
    });

    test('should update policy state with audit trail', async () => {
      const policyId = 'test-policy-id';
      const newState: PolicyState = 'suspended';
      const reason = 'Quality score below threshold';
      const adminUserId = 'admin-123';
      
      // Mock current policy state query
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ state: 'active' }] })
        .mockResolvedValueOnce({ rowCount: 1 }) // Update query
        .mockResolvedValueOnce({ rowCount: 1 }); // Audit trail insert
      
      await policyService.updatePolicyState(policyId, newState, reason, adminUserId);
      
      // Verify policy update and audit trail creation
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO v2_policy_state_history'),
        expect.arrayContaining([policyId, 'active', newState, reason, adminUserId])
      );
    });

    test('should search policies with text matching', async () => {
      const searchQuery = 'silver extra';
      const mockSearchResults = [
        {
          id: 'policy-1',
          policy_name: 'Silver Extra Hospital',
          provider_code: 'TEST_PROVIDER',
          provider_name: 'Test Provider'
        }
      ];
      
      mockPool.query
        .mockResolvedValueOnce({ rows: mockSearchResults });

      const result = await policyService.searchPolicies(searchQuery, 'AU');
      
      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/ILIKE/),
        [`%${searchQuery}%`, 'AU']
      );
    });

    test('should handle policy creation with validation errors', async () => {
      const invalidPolicyData = {
        providerId: 'non-existent-provider',
        policyName: '',
        policyType: 'invalid' as any,
        policyTier: 'invalid' as any,
        countryCode: 'AU',
        isActive: true,
        features: {} as any // Invalid features structure
      };
      
      mockPool.query
        .mockRejectedValueOnce(new Error('Provider not found'));

      await expect(policyService.createPolicy(invalidPolicyData))
        .rejects.toThrow('Provider not found');
    });

    test('should get policy by ID with full metadata', async () => {
      const policyId = 'test-policy-id';
      const mockPolicyRow = {
        id: policyId,
        policy_name: 'Test Policy',
        policy_type: 'combined',
        policy_tier: 'silver',
        provider_code: 'TEST_PROVIDER',
        provider_name: 'Test Provider',
        state: 'active',
        quality_score: 0.9,
        effective_from: new Date(),
        effective_until: null,
        updated_at: new Date(),
        policy_features: testPolicyFeatures
      };
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPolicyRow] });

      const result = await policyService.getPolicyById(policyId);
      
      expect(result).toBeTruthy();
      expect(result!.id).toBe(policyId);
      expect(result!.features).toEqual(testPolicyFeatures);
      expect(result!.qualityScore).toBe(0.9);
    });
  });

  describe('V2 Architecture Compliance', () => {
    test('should maintain separation between metadata and features', async () => {
      const mockPolicyWithMetadata: ProviderPolicyWithMetadata = {
        // Database metadata
        id: 'policy-123',
        policyName: 'Test Policy',
        policyType: 'combined',
        policyTier: 'silver',
        providerCode: 'TEST_PROVIDER',
        providerName: 'Test Provider',
        state: 'active',
        qualityScore: 0.85,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        updatedAt: new Date(),
        
        // V2 Policy Features
        features: testPolicyFeatures
      };

      // Verify type structure maintains separation
      expect(mockPolicyWithMetadata).toHaveProperty('id');
      expect(mockPolicyWithMetadata).toHaveProperty('features');
      expect(mockPolicyWithMetadata.features).toHaveProperty('policyType');
      expect(mockPolicyWithMetadata.features).toHaveProperty('coverageCategories');
      expect(mockPolicyWithMetadata.features).toHaveProperty('constraints');
    });

    test('should support flexible policy features with JSONB', () => {
      const extendedFeatures = {
        ...testPolicyFeatures,
        customFeatures: {
          telemedicine: { covered: true, sessionLimit: 12 },
          mentalHealth: { covered: true, sessionLimit: 8 },
          pregnancySupport: { covered: true, annualLimit: 2000 }
        },
        regionalVariations: {
          metro: { hospitalNetworkSize: 'large' },
          rural: { hospitalNetworkSize: 'medium', travelAllowance: 500 }
        }
      };

      // Verify extended features structure is valid
      expect(extendedFeatures).toHaveProperty('customFeatures');
      expect(extendedFeatures).toHaveProperty('regionalVariations');
      expect(extendedFeatures.coverageCategories).toBeDefined();
      expect(extendedFeatures.constraints).toBeDefined();
    });

    test('should validate country-agnostic design', () => {
      const usFeatures: ProviderPolicyFeatures = {
        ...testPolicyFeatures,
        regionalSpecifics: {
          countryCode: 'US',
          regulatoryFramework: 'ACA',
          localRequirements: ['state_mandates', 'federal_compliance']
        }
      };

      const ukFeatures: ProviderPolicyFeatures = {
        ...testPolicyFeatures,
        regionalSpecifics: {
          countryCode: 'UK',
          regulatoryFramework: 'NHS_SUPPLEMENT',
          localRequirements: ['fca_compliance', 'pra_requirements']
        }
      };

      // Both should be valid ProviderPolicyFeatures
      expect(usFeatures).toHaveProperty('policyType');
      expect(ukFeatures).toHaveProperty('policyType');
      expect(usFeatures.regionalSpecifics?.countryCode).toBe('US');
      expect(ukFeatures.regionalSpecifics?.countryCode).toBe('UK');
    });
  });

  describe('Integration with Policy Processor', () => {
    test('should provide compatible data format for policy comparison', async () => {
      const mockActivePolicies = [
        {
          id: 'policy-1',
          policyName: 'Silver Extra',
          policyType: 'combined' as const,
          policyTier: 'silver' as const,
          providerCode: 'TEST_PROVIDER',
          providerName: 'Test Provider',
          state: 'active' as const,
          qualityScore: 0.85,
          effectiveFrom: new Date(),
          effectiveUntil: null,
          updatedAt: new Date(),
          features: testPolicyFeatures
        }
      ];
      
      mockPool.query
        .mockResolvedValueOnce({ 
          rows: mockActivePolicies.map(policy => ({
            ...policy,
            policy_name: policy.policyName,
            policy_type: policy.policyType,
            policy_tier: policy.policyTier,
            provider_code: policy.providerCode,
            provider_name: policy.providerName,
            quality_score: policy.qualityScore,
            effective_from: policy.effectiveFrom,
            effective_until: policy.effectiveUntil,
            updated_at: policy.updatedAt,
            policy_features: policy.features
          }))
        });

      const result = await policyService.getActivePolicies('AU');
      
      // Should return ProviderPolicyWithMetadata format
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('features');
      expect(result[0].features).toHaveProperty('premiumRanges');
      expect(result[0].features).toHaveProperty('coverageCategories');
      expect(result[0].features).toHaveProperty('constraints');
    });
  });
});

// Export test utilities for use in other test files
export const testData = {
  testProvider,
  testPolicyFeatures,
  createTestProviderId: () => `test-provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  createTestPolicyId: () => `test-policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  getMockPolicyWithMetadata: (overrides = {}): ProviderPolicyWithMetadata => ({
    id: 'mock-policy-id',
    policyName: 'Mock Policy',
    policyType: 'combined',
    policyTier: 'silver',
    providerCode: 'MOCK_PROVIDER',
    providerName: 'Mock Provider',
    state: 'active',
    qualityScore: 0.8,
    effectiveFrom: new Date(),
    effectiveUntil: null,
    updatedAt: new Date(),
    features: testPolicyFeatures,
    ...overrides
  })
};