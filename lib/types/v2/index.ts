/**
 * V2 Flexible Policy Types - Country-Agnostic Architecture
 * Supports multiple regulatory frameworks and dynamic feature structures
 */

// Re-export API types
export * from './api';

// ============================================================================
// COUNTRY & CONFIGURATION TYPES
// ============================================================================

export interface CountryConfiguration {
  countryCode: string;                          // 'AU', 'SG', 'NZ'
  countryName: string;                          // 'Australia', 'Singapore'
  currency: string;                             // 'AUD', 'SGD', 'NZD'
  regulatoryFramework: RegulatoryFramework;
  policyTypes: PolicyTypeDefinition[];
  tierSystems: TierSystemDefinition[];
  coverageCategories: CoverageCategory[];
  standardConstraints: ConstraintTemplate[];
  localization: CountryLocalization;
}

export interface RegulatoryFramework {
  frameworkName: string;                        // 'Private Health Insurance Act 2007'
  mandatoryFeatures: string[];                  // Must be offered
  prohibitedFeatures: string[];                 // Cannot be offered
  standardWaitingPeriods: Record<string, string>;
  excessRegulations: ExcessRegulation[];
}

export interface PolicyTypeDefinition {
  typeId: string;                               // 'hospital', 'extras', 'combined'
  displayName: string;                          // 'Hospital Only', 'Extras Only'
  description?: string;
}

export interface TierSystemDefinition {
  systemId: string;                             // 'standard', 'ward_class'
  tiers: TierDefinition[];
}

export interface TierDefinition {
  tierId: string;                               // 'gold', 'ward_a'
  tierOrder: number;                            // 1-5 for ranking
  displayName: string;                          // 'Gold', 'Ward A'
  description: string;                          // Human-readable explanation
  regulatoryRequirements?: string[];            // What this tier must include
}

// ============================================================================
// FLEXIBLE POLICY CORE TYPES
// ============================================================================

export interface BasePolicyFeatures {
  // Universal identification
  country: string;                              // 'AU', 'SG', 'NZ'
  regulatoryFramework: string;                  // Framework identifier
  
  // Flexible classification
  classification: PolicyClassification;
  
  // Dynamic feature structure
  coverageCategories: Record<string, CoverageCategory>;
  
  // Flexible constraints
  constraints: PolicyConstraint[];
  
  // Metadata
  metadata: PolicyMetadata;
}

export interface PolicyClassification {
  primaryType: string;                          // Configurable: 'hospital' | 'medical'
  tierSystem?: TierDefinition;                  // Optional: countries without tiers
  regulatoryCategory?: string;                  // Country-specific: 'complying-product'
}

export interface CoverageCategory {
  categoryId: string;                           // 'hospital' | 'dental' | 'optical'
  displayName: string;                          // Localized name
  features: Record<string, FeatureDetail>;
  categoryConstraints: CategoryConstraint[];
}

// ============================================================================
// FEATURE DETAIL STRUCTURE (GRANULAR)
// ============================================================================

export interface FeatureDetail {
  featureId: string;                            // Unique identifier
  displayName: string;                          // Localized name
  covered: boolean;
  
  // Flexible benefit structure
  benefitStructure: BenefitStructure;
  
  // Flexible constraints
  constraints: FeatureConstraint[];
  
  // Regulatory compliance
  regulatoryStatus?: 'mandatory' | 'optional' | 'restricted';
  
  // User-friendly explanation
  description: string;                          // "85% back up to $1,500 per year"
  limitations: string[];                        // ["Max 12 sessions", "Pre-approval required"]
}

export interface BenefitStructure {
  type: 'percentage' | 'fixed_amount' | 'capped_amount' | 'hybrid' | 'unlimited';
  
  // Percentage-based benefits (common globally)
  rebatePercentage?: number;                    // 0-100
  
  // Amount-based benefits
  fixedAmount?: MoneyAmount;
  cappedAmount?: MoneyAmount;
  
  // Limits and frequencies
  limits: BenefitLimit[];
}

export interface BenefitLimit {
  limitType: 'annual' | 'lifetime' | 'per_service' | 'per_episode' | 'calendar_year' | 'benefit_year';
  amount: MoneyAmount | number;                 // Money or count
  description: string;
}

export interface MoneyAmount {
  amount: number;
  currency: string;                             // 'AUD', 'SGD', 'NZD'
  displayFormat?: string;                       // '$1,500', '¥150,000'
}

// ============================================================================
// CONSTRAINT SYSTEM (FLEXIBLE)
// ============================================================================

export interface PolicyConstraint {
  constraintType: string;                       // 'waiting_period' | 'excess' | 'network'
  appliesTo: string[];                          // Feature IDs or categories
  value: any;                                   // Flexible value structure
  description: string;
  regulatoryBasis?: string;                     // Which regulation requires this
}

export interface WaitingPeriodConstraint extends PolicyConstraint {
  constraintType: 'waiting_period';
  value: {
    duration: string;                           // '12 months' | '90 days'
    startTrigger: string;                       // 'coverage_start' | 'first_claim'
    exemptions?: string[];                      // Emergency services, etc.
  };
}

export interface ExcessConstraint extends PolicyConstraint {
  constraintType: 'excess';
  value: {
    amount: MoneyAmount;
    applicationType: 'per_claim' | 'annual' | 'per_admission' | 'per_service';
    exemptions?: string[];
    familyCap?: MoneyAmount;
  };
}

export interface FeatureConstraint {
  type: 'pre_approval' | 'provider_network' | 'age_limit' | 'frequency_limit' | 'medical_necessity';
  description: string;
  appliesTo: string[];                          // Which specific services
}

export interface CategoryConstraint {
  constraintType: string;
  description: string;
  affectedFeatures: string[];
}

// ============================================================================
// PII-AWARE POLICY TYPES (TYPE SAFETY)
// ============================================================================

// PROVIDER POLICIES - Always clean, compile-time guaranteed
export interface ProviderPolicyFeatures extends BasePolicyFeatures {
  readonly _context: 'PROVIDER_POLICY';
  readonly _piiStatus: 'NO_PII';
  premiumRanges: {
    single: { min: number; max: number };
    couple: { min: number; max: number };
    family: { min: number; max: number };
  };
}

// USER POLICIES - PII-aware with state tracking
export interface UserPolicyFeatures extends BasePolicyFeatures {
  readonly _context: 'USER_POLICY';
  readonly _piiStatus: 'CONTAINS_PII' | 'ANONYMIZED' | 'ENCRYPTED';
  
  // PII-containing fields (when status = CONTAINS_PII)
  actualPremium?: MoneyAmount;
  personalConditions?: string[];
  membershipId?: string;
}

export interface AnonymizedUserPolicyFeatures extends UserPolicyFeatures {
  readonly _piiStatus: 'ANONYMIZED';
  premiumCategory: 'under-200' | '200-400' | '400-600' | 'over-600';
  excessCategory: 'none' | 'under-500' | '500-1000' | 'over-1000';
  ageCategory: 'under-30' | '30-50' | 'over-50';
  familyTier: 'single' | 'couple' | 'family';
}

export interface EncryptedUserPolicyFeatures extends UserPolicyFeatures {
  readonly _piiStatus: 'ENCRYPTED';
  encryptedPremiumAmount?: string;
  encryptedPersonalConditions?: string[];
  encryptionKey?: string;
}

// ============================================================================
// PROVIDER & COMPARISON TYPES
// ============================================================================

export interface ProviderPolicy {
  id: string;
  providerCode: string;                         // 'HCF', 'MEDIBANK'
  providerName: string;                         // 'HCF Health Insurance'
  policyName: string;                           // 'Silver Plus'
  country: string;                              // 'AU', 'SG', 'NZ'
  features: ProviderPolicyFeatures;
  availableRegions: string[];                   // States/provinces where available
  websiteUrl?: string;
  contactPhone?: string;
  lastUpdated: Date;
}

export interface ComparisonResult {
  policy: ProviderPolicy;
  overallScore: number;
  categoryScores: Record<string, number>;       // Dynamic category scoring
  confidence: number;
  reasoning: string[];
  improvements: FeatureComparison[];
  tradeOffs: string[];
  estimatedSavings?: MoneyAmount;
}

export interface FeatureComparison {
  categoryId: string;
  featureId: string;
  featureName: string;
  userCurrent: FeatureDetail | null;
  recommendedPolicy: FeatureDetail | null;
  
  // Calculated insights
  annualSavings?: MoneyAmount;
  waitingPeriodDifference?: string;
  valueProposition: string;
  tradeOffs: string[];
}

// ============================================================================
// SESSION & RESULTS TYPES
// ============================================================================

export interface AnalysisSession {
  sessionId: string;
  country: string;
  status: 'processing' | 'completed' | 'error';
  progress: ProgressState;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface ProgressState {
  stage: number;                                // 1-7
  percentage: number;                           // 0-100
  message: string;
  estimatedTimeRemaining: number;               // seconds
  currentOperation: string;
}

export interface AnalysisResults {
  sessionId: string;
  country: string;
  userPolicyFeatures: AnonymizedUserPolicyFeatures;
  recommendations: ComparisonResult[];
  totalPoliciesCompared: number;
  processingTimeMs: number;
  confidence: number;
  generatedAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PolicyMetadata {
  extractionConfidence: number;                 // 0.0-1.0
  featureCount: number;
  processingVersion: string;                    // '2.0.0'
  aiModel: string;                              // 'gemini-1.5'
}

export interface CountryLocalization {
  language: string;                             // 'en-AU', 'en-SG'
  dateFormat: string;                           // 'DD/MM/YYYY', 'MM/DD/YYYY'
  currencyFormat: string;                       // '$1,500.00', 'S$1,500.00'
  terminology: Record<string, string>;          // Local insurance terms
}

export interface ExcessRegulation {
  maxAmount?: MoneyAmount;
  minAmount?: MoneyAmount;
  applicationType: string[];
  exemptions: string[];
}

export interface ConstraintTemplate {
  constraintType: string;
  defaultValue: any;
  description: string;
  regulatoryBasis: string;
}

// ============================================================================
// COUNTRY-SPECIFIC EXTENSIONS
// ============================================================================

export interface AustralianSpecific {
  medicareRebate?: number;                      // Percentage of Medicare rebate
  lifetimeHealthCover?: {
    applicable: boolean;
    loadingPercentage?: number;
  };
  privateHealthRebate?: {
    applicable: boolean;
    tier: string;                               // Income tier
  };
}

export interface SingaporeSpecific {
  medisaveUsage?: {
    claimable: boolean;
    monthlyLimit?: MoneyAmount;
    annualLimit?: MoneyAmount;
  };
  governmentSubsidy?: {
    subsidyPercentage: number;
    subsidyType: string;                        // 'pioneer_generation' | 'chas'
  };
}

export interface NewZealandSpecific {
  accCoverage?: {
    integrated: boolean;
    accExclusions?: string[];
  };
  publicHealthIntegration?: {
    waitingListBypass: boolean;
    publicSystemGaps: string[];
  };
}

// ============================================================================
// TYPE SAFETY FUNCTIONS
// ============================================================================

// Compile-time safety function signatures
export type SafeComparisonFunction = (
  userFeatures: AnonymizedUserPolicyFeatures,  // Must be anonymized
  providerFeatures: ProviderPolicyFeatures[],  // Always clean
  country: string                               // Country context required
) => Promise<ComparisonResult[]>;

export type CountryAwareAnalysisFunction = (
  content: string,
  country: string,
  config: CountryConfiguration
) => Promise<BasePolicyFeatures>;