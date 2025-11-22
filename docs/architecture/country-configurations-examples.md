# Country Configuration Examples
## Flexible Insurance Architecture in Practice

### Australia Configuration

```json
{
  "countryCode": "AU",
  "countryName": "Australia",
  "currency": "AUD",
  "regulatoryFramework": {
    "frameworkName": "Private Health Insurance Act 2007",
    "mandatoryFeatures": ["private_hospital", "emergency_ambulance"],
    "prohibitedFeatures": ["medicare_replacement"],
    "standardWaitingPeriods": {
      "hospital": "12 months",
      "extras": "2 months",
      "pre_existing": "12 months",
      "obstetrics": "12 months",
      "orthodontics": "24 months"
    }
  },
  "policyTypes": [
    {"typeId": "hospital", "displayName": "Hospital Only"},
    {"typeId": "extras", "displayName": "Extras Only"},
    {"typeId": "combined", "displayName": "Hospital & Extras"}
  ],
  "tierSystems": [
    {
      "systemId": "standard",
      "tiers": [
        {"tierId": "basic", "order": 1, "displayName": "Basic", "description": "Emergency and basic hospital"},
        {"tierId": "bronze", "order": 2, "displayName": "Bronze", "description": "Basic hospital plus some exclusions"},
        {"tierId": "silver", "order": 3, "displayName": "Silver", "description": "Comprehensive hospital with extras"},
        {"tierId": "gold", "order": 4, "displayName": "Gold", "description": "Top level hospital and extras"}
      ]
    }
  ],
  "coverageCategories": [
    {
      "categoryId": "hospital",
      "displayName": "Hospital Coverage",
      "standardFeatures": ["private_hospital", "choice_of_doctor", "emergency_ambulance", "day_surgery"]
    },
    {
      "categoryId": "extras",
      "displayName": "Extras Coverage", 
      "standardFeatures": ["general_dental", "optical", "physiotherapy", "psychology"]
    }
  ]
}
```

### Singapore Configuration

```json
{
  "countryCode": "SG", 
  "countryName": "Singapore",
  "currency": "SGD",
  "regulatoryFramework": {
    "frameworkName": "Medisave Act",
    "mandatoryFeatures": ["medishield_life_integration"],
    "prohibitedFeatures": ["government_hospital_replacement"],
    "standardWaitingPeriods": {
      "pre_existing": "12 months",
      "maternity": "10 months"
    }
  },
  "policyTypes": [
    {"typeId": "integrated_shield", "displayName": "Integrated Shield Plan"},
    {"typeId": "supplement", "displayName": "Medical Supplement"},
    {"typeId": "riders", "displayName": "Rider Plans"}
  ],
  "tierSystems": [
    {
      "systemId": "ward_class",
      "tiers": [
        {"tierId": "ward_c", "order": 1, "displayName": "Ward C", "description": "6-bedded ward"},
        {"tierId": "ward_b2", "order": 2, "displayName": "Ward B2", "description": "4-bedded ward"},
        {"tierId": "ward_b1", "order": 3, "displayName": "Ward B1", "description": "2-bedded ward"}, 
        {"tierId": "ward_a", "order": 4, "displayName": "Ward A", "description": "Single bed ward"}
      ]
    }
  ],
  "coverageCategories": [
    {
      "categoryId": "inpatient",
      "displayName": "Inpatient Benefits",
      "standardFeatures": ["ward_accommodation", "surgical_fees", "hospital_services"]
    },
    {
      "categoryId": "outpatient",
      "displayName": "Outpatient Benefits",
      "standardFeatures": ["specialist_consultation", "diagnostic_tests", "day_surgery"]
    }
  ]
}
```

### New Zealand Configuration

```json
{
  "countryCode": "NZ",
  "countryName": "New Zealand", 
  "currency": "NZD",
  "regulatoryFramework": {
    "frameworkName": "Health and Disability Services Act",
    "mandatoryFeatures": ["acc_integration"],
    "prohibitedFeatures": ["public_health_duplication"],
    "standardWaitingPeriods": {
      "pre_existing": "6 months",
      "specialist_treatment": "3 months"
    }
  },
  "policyTypes": [
    {"typeId": "comprehensive", "displayName": "Comprehensive Health"},
    {"typeId": "surgical", "displayName": "Surgical & Specialist"},
    {"typeId": "wellbeing", "displayName": "Wellbeing & Preventive"}
  ],
  "tierSystems": [
    {
      "systemId": "coverage_level",
      "tiers": [
        {"tierId": "essential", "order": 1, "displayName": "Essential", "description": "Basic private hospital"},
        {"tierId": "comprehensive", "order": 2, "displayName": "Comprehensive", "description": "Full private hospital plus extras"},
        {"tierId": "ultimate", "order": 3, "displayName": "Ultimate", "description": "Premium coverage with additional benefits"}
      ]
    }
  ],
  "coverageCategories": [
    {
      "categoryId": "private_hospital",
      "displayName": "Private Hospital",
      "standardFeatures": ["elective_surgery", "specialist_treatment", "private_room"]
    },
    {
      "categoryId": "specialist_services",
      "displayName": "Specialist Services", 
      "standardFeatures": ["consultations", "diagnostics", "mental_health"]
    }
  ]
}
```

### Feature Mapping Examples

```typescript
// Global feature mapped to different countries
const physiotherapy: GlobalFeature = {
  featureId: "physiotherapy",
  category: "therapy",
  globalDescription: "Physical rehabilitation therapy",
  commonNames: ["physiotherapy", "physical_therapy", "physio", "rehabilitation"]
};

// Country-specific mappings
const countryMappings = {
  "AU": {
    globalFeatureId: "physiotherapy",
    localFeatureId: "physio_au",
    localDisplayName: "Physiotherapy",
    regulatoryStatus: "optional",
    standardBenefits: [{
      type: "percentage",
      rebatePercentage: 85,
      limits: [
        {limitType: "annual", amount: {amount: 800, currency: "AUD"}}
      ]
    }]
  },
  
  "SG": {
    globalFeatureId: "physiotherapy", 
    localFeatureId: "physio_sg",
    localDisplayName: "Physiotherapy Services",
    regulatoryStatus: "optional",
    standardBenefits: [{
      type: "fixed_amount",
      fixedAmount: {amount: 50, currency: "SGD"},
      limits: [
        {limitType: "per_service", amount: {amount: 80, currency: "SGD"}},
        {limitType: "annual", amount: 24}  // 24 sessions
      ]
    }]
  },
  
  "NZ": {
    globalFeatureId: "physiotherapy",
    localFeatureId: "physio_nz", 
    localDisplayName: "Physiotherapy Treatment",
    regulatoryStatus: "optional",
    standardBenefits: [{
      type: "capped_amount",
      cappedAmount: {amount: 60, currency: "NZD"},
      limits: [
        {limitType: "annual", amount: {amount: 1000, currency: "NZD"}}
      ]
    }]
  }
};
```

### Dynamic AI Prompts

```typescript
// Country-aware prompts
const australianPrompt = `
Extract Australian health insurance features using these patterns:
- Policy tiers: Basic, Bronze, Silver, Gold
- Waiting periods: 2 months (extras), 12 months (hospital, pre-existing)
- Currency: Australian dollars (AUD)
- Key features: Private hospital, choice of doctor, emergency ambulance
- Regulatory terms: Complying product, lifetime health cover, Medicare levy surcharge
`;

const singaporePrompt = `
Extract Singapore health insurance features using these patterns:
- Plan types: Integrated Shield Plan, Riders, Supplements  
- Ward classes: A (private), B1 (2-bed), B2 (4-bed), C (6-bed)
- Currency: Singapore dollars (SGD)
- Key features: Medisave claimable, Panel/Non-panel doctors, As-charged/Co-payment
- Regulatory terms: MediShield Life integration, Medisave usage limits
`;
```

### Migration Strategy

#### Phase 1: Flexible Foundation (Week 1-2)
```typescript
// Start with configuration-driven types
interface CountryConfig {
  // Load from JSON configuration files
  tiers: TierDefinition[];
  features: FeatureDefinition[];
  constraints: ConstraintTemplate[];
}

// Dynamic policy structure  
interface FlexiblePolicy {
  country: string;
  features: Record<string, FeatureDetail>;
  constraints: PolicyConstraint[];
}
```

#### Phase 2: Multi-Country Implementation (Week 3-5)  
- Implement Australia config (existing functionality)
- Add Singapore configuration and test data
- Build country-specific AI extraction
- Create flexible comparison algorithms

#### Phase 3: Advanced Features (Week 6-8)
- Cross-border comparison capabilities
- Regulation change management
- Provider-specific variations
- Multi-currency support

This approach makes the platform **truly global and future-proof** while maintaining the granular decision-making capabilities users need!