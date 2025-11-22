# Flexible Policy Architecture Design
## For Global Insurance Comparison Platform

### Problem Statement
Health insurance structures vary significantly across countries:
- **Australia**: Bronze/Silver/Gold tiers, Medicare integration, waiting periods
- **Singapore**: Medisave/MediShield Life/Integrated Shield Plans, government subsidies
- **New Zealand**: Public health system + private insurance gap coverage
- **USA**: Metal tiers (Bronze/Silver/Gold/Platinum), deductibles, networks
- **UK**: NHS + private health insurance supplements

### Solution: Configuration-Driven Flexible Architecture

#### 1. Country-Agnostic Core Structure

```typescript
// COUNTRY-AGNOSTIC CORE
interface PolicyFeatures {
  // Universal policy identification
  country: string;                      // 'AU', 'SG', 'NZ', 'US', 'UK'
  regulatoryFramework: string;          // 'private-health-insurance-act-2007' | 'medisave-act' | etc
  
  // Flexible classification system
  classification: PolicyClassification;
  
  // Dynamic feature structure
  coverageCategories: Record<string, CoverageCategory>;
  
  // Flexible constraints
  constraints: PolicyConstraint[];
  
  // Country-specific metadata
  countrySpecific: Record<string, any>;
}

// FLEXIBLE CLASSIFICATION SYSTEM
interface PolicyClassification {
  primaryType: string;                  // Configurable: 'hospital' | 'medical' | 'health-savings'
  tierSystem?: TierDefinition;          // Optional: countries without tiers
  regulatoryCategory?: string;          // Country-specific: 'complying-product' | 'basic-cover'
}

interface TierDefinition {
  tierName: string;                     // 'gold' | 'comprehensive' | 'plan-a'
  tierOrder: number;                    // 1-5 for ranking
  description: string;                  // Human-readable explanation
  regulatoryRequirements?: string[];    // What this tier must include
}

// DYNAMIC COVERAGE STRUCTURE
interface CoverageCategory {
  categoryId: string;                   // 'hospital' | 'ambulatory' | 'dental' | 'optical'
  displayName: string;                  // Localized name
  features: Record<string, FeatureDetail>;
  categoryConstraints: CategoryConstraint[];
}

interface FeatureDetail {
  featureId: string;                    // Unique identifier
  displayName: string;                  // Localized name
  covered: boolean;
  
  // Flexible benefit structure
  benefitStructure: BenefitStructure;
  
  // Flexible constraints
  constraints: FeatureConstraint[];
  
  // Regulatory compliance markers
  regulatoryStatus?: string;            // 'mandatory' | 'optional' | 'restricted'
}

// FLEXIBLE BENEFIT STRUCTURE
interface BenefitStructure {
  type: 'percentage' | 'fixed_amount' | 'capped_amount' | 'hybrid' | 'unlimited';
  
  // Percentage-based benefits (common globally)
  rebatePercentage?: number;            // 0-100
  
  // Amount-based benefits
  fixedAmount?: MoneyAmount;
  cappedAmount?: MoneyAmount;
  
  // Limits and frequencies
  limits: BenefitLimit[];
}

interface BenefitLimit {
  limitType: 'annual' | 'lifetime' | 'per_service' | 'per_episode' | 'calendar_year' | 'benefit_year';
  amount: MoneyAmount | number;         // Money or count
  description: string;
}

interface MoneyAmount {
  amount: number;
  currency: string;                     // 'AUD', 'SGD', 'NZD', 'USD', 'GBP'
  displayFormat?: string;               // '$1,500', '¥150,000'
}

// FLEXIBLE CONSTRAINT SYSTEM
interface PolicyConstraint {
  constraintType: string;               // 'waiting_period' | 'excess' | 'network' | 'age_limit'
  appliesTo: string[];                  // Feature IDs or categories
  value: any;                           // Flexible value structure
  description: string;
  regulatoryBasis?: string;             // Which regulation requires this
}

interface WaitingPeriodConstraint extends PolicyConstraint {
  constraintType: 'waiting_period';
  value: {
    duration: string;                   // '12 months' | '90 days' | '2 years'
    startTrigger: string;               // 'coverage_start' | 'first_claim' | 'service_category'
    exemptions?: string[];              // Emergency services, etc.
  };
}

interface ExcessConstraint extends PolicyConstraint {
  constraintType: 'excess';
  value: {
    amount: MoneyAmount;
    applicationType: 'per_claim' | 'annual' | 'per_admission' | 'per_service';
    exemptions?: string[];
    familyCap?: MoneyAmount;
  };
}

// COUNTRY-SPECIFIC EXTENSIONS
interface AustralianSpecific {
  medicareRebate?: number;              // Percentage of Medicare rebate
  lifetimeHealthCover?: {
    applicable: boolean;
    loadingPercentage?: number;
  };
  privateHealthRebate?: {
    applicable: boolean;
    tier: string;                       // Income tier
  };
}

interface SingaporeSpecific {
  medisaveUsage?: {
    claimable: boolean;
    monthlyLimit?: MoneyAmount;
    annualLimit?: MoneyAmount;
  };
  governmentSubsidy?: {
    subsidyPercentage: number;
    subsidyType: string;                // 'pioneer_generation' | 'chas' | 'standard'
  };
}

interface NewZealandSpecific {
  accCoverage?: {
    integrated: boolean;
    accExclusions?: string[];
  };
  publicHealthIntegration?: {
    waitingListBypass: boolean;
    publicSystemGaps: string[];
  };
}
```

#### 2. Configuration-Driven Country Support

```typescript
// COUNTRY CONFIGURATION SYSTEM
interface CountryConfiguration {
  countryCode: string;
  countryName: string;
  currency: string;
  
  // Regulatory framework
  regulatoryFramework: RegulatoryFramework;
  
  // Available policy types and tiers
  policyTypes: PolicyTypeDefinition[];
  tierSystems: TierSystemDefinition[];
  
  // Standard coverage categories
  coverageCategories: CoverageCategory[];
  
  // Common constraints
  standardConstraints: ConstraintTemplate[];
  
  // Localization
  localization: CountryLocalization;
}

interface RegulatoryFramework {
  frameworkName: string;
  mandatoryFeatures: string[];          // Must be offered
  prohibitedFeatures: string[];         // Cannot be offered
  standardWaitingPeriods: Record<string, string>;
  excessRegulations: ExcessRegulation[];
}

// DYNAMIC FEATURE REGISTRY
interface FeatureRegistry {
  // Global feature catalog
  globalFeatures: Record<string, GlobalFeature>;
  
  // Country-specific feature mappings
  countryMappings: Record<string, CountryFeatureMapping>;
}

interface GlobalFeature {
  featureId: string;
  category: string;                     // 'hospital' | 'dental' | 'optical'
  globalDescription: string;
  commonNames: string[];                // 'physiotherapy' | 'physical_therapy' | 'physio'
}

interface CountryFeatureMapping {
  globalFeatureId: string;
  localFeatureId: string;
  localDisplayName: string;
  regulatoryStatus: 'mandatory' | 'optional' | 'restricted' | 'prohibited';
  standardBenefits?: BenefitStructure[];
}
```

#### 3. AI Processing Adaptation

```typescript
// COUNTRY-AWARE AI ANALYSIS
interface CountryAwareAnalyzer {
  countryCode: string;
  
  // Load country configuration
  loadConfiguration(): Promise<CountryConfiguration>;
  
  // Extract features using country-specific patterns
  extractFeatures(
    document: string, 
    config: CountryConfiguration
  ): Promise<PolicyFeatures>;
  
  // Compare policies within regulatory framework
  comparePolicies(
    userPolicy: PolicyFeatures,
    providerPolicies: PolicyFeatures[],
    config: CountryConfiguration
  ): Promise<ComparisonResult[]>;
}

// FLEXIBLE EXTRACTION PATTERNS
interface ExtractionPattern {
  country: string;
  featureType: string;
  
  // Regex patterns for different countries
  patterns: RegexPattern[];
  
  // Common terminology mappings
  terminology: Record<string, string[]>;
  
  // Currency and amount patterns
  currencyPatterns: CurrencyPattern[];
}
```

### Implementation Strategy

#### Phase 1: Flexible Core (2-3 weeks)
- Implement configuration-driven type system
- Create country configuration files
- Build flexible feature registry
- Update AI extraction for dynamic features

#### Phase 2: Multi-Country Support (3-4 weeks)
- Add Singapore configuration
- Add New Zealand configuration  
- Test cross-country feature mapping
- Validate regulatory compliance per country

#### Phase 3: Advanced Features (2-3 weeks)
- Country-specific recommendation algorithms
- Regulatory compliance checking
- Cross-border comparison capabilities
- Multi-currency support

### Benefits

1. **🌏 Global Scalability**: Add new countries with configuration files, not code changes
2. **🔧 Regulatory Flexibility**: Adapt to changing regulations through configuration
3. **🚀 Feature Extensibility**: New coverage types don't require core changes
4. **🎯 Country Optimization**: Tailored AI models per regulatory environment
5. **⚡ Change Management**: Provider variations handled through flexible constraints
6. **🔄 Future-Proof**: Architecture adapts to insurance industry evolution

This approach transforms the platform from "Australian insurance comparison" to "global insurance intelligence platform" with true regulatory flexibility.