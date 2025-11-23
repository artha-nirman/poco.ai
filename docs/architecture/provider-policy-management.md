# Provider Policy Management Architecture
## Comprehensive Technical Design for Poco.ai V2

---

## 1. Overview

This document defines the technical architecture for provider policy onboarding, management, and lifecycle control within the V2 country-agnostic system. The design extends existing V2 patterns while introducing specialized provider data handling capabilities.

### 1.1 Integration with V2 Architecture

**Builds Upon**:
- V2 flexible policy architecture from `/docs/architecture/service-abstractions.md`
- Country-agnostic design from `/docs/architecture/technical-architecture.md`
- Type-safe PII protection patterns from `/docs/security/pii-protection-architecture.md`
- **EXISTING** V2 database schema from `/docs/database/v2-schema.sql`

**Schema Extension Strategy**:
- **EXTENDS** existing `v2_provider_policies` table (does not replace)
- **ADDS** new `v2_providers` table for provider organization management
- **PRESERVES** all existing V2 functionality and data
- **MAINTAINS** backward compatibility with current V2 implementation

**Key Principles**:
- **No PII Concerns**: Provider policies are public documents without personal information
- **Country-Agnostic**: Support multiple regulatory frameworks through configuration
- **Type Safety**: Compile-time guarantees for `ProviderPolicyFeatures` 
- **Scalable Operations**: Handle 100+ providers with minimal manual intervention
- **Quality Assurance**: Automated validation with human-in-loop for exceptions

---

## 2. Data Architecture

### 2.1 Provider Policy Type System

Building on existing V2 types from `/lib/types/v2/index.ts`:

```typescript
// PROVIDER POLICIES - Always PII-free with compile-time guarantee
interface ProviderPolicyFeatures extends BasePolicyFeatures {
  readonly _context: 'PROVIDER_POLICY';
  readonly _piiStatus: 'NO_PII';
  
  // Pricing structure (no personal data)
  premiumRanges: {
    single: { min: number; max: number };
    couple: { min: number; max: number };
    family: { min: number; max: number };
  };
  
  // Provider-specific metadata
  providerMetadata: ProviderMetadata;
  effectiveDate: Date;
  expiryDate?: Date;
  
  // Market positioning
  marketSegment: 'budget' | 'mid-tier' | 'premium';
  targetDemographics: string[];
}

interface ProviderMetadata {
  providerId: string;
  providerCode: string;                    // 'HCF', 'MEDIBANK'
  providerName: string;                    // 'HCF Health Insurance'
  licenseNumber: string;
  contactInfo: ProviderContactInfo;
  commissionStructure?: CommissionInfo;    // Business terms
}

interface ProviderContactInfo {
  website: string;
  phone: string;
  email: string;
  supportHours: string;
  claimsContact: string;
}

interface CommissionInfo {
  baseRate: number;                        // Percentage
  volumeTiers?: VolumeTier[];
  paymentTerms: string;                    // '30 days', 'monthly'
  trackingCode?: string;                   // For attribution
}
```

### 2.2 Policy Lifecycle Management

```typescript
// Policy state management
interface ProviderPolicy {
  id: string;
  state: PolicyState;
  features: ProviderPolicyFeatures;
  
  // Lifecycle tracking
  stateHistory: StateTransition[];
  qualityScore: number;                    // 0-100 automated assessment
  lastValidated: Date;
  
  // Management controls
  visibility: VisibilityControl;
  adminNotes?: AdminNote[];
}

enum PolicyState {
  DRAFT = 'draft',                         // Ingested, not live
  PENDING_REVIEW = 'pending_review',       // Needs human approval
  ACTIVE = 'active',                       // Live in comparison engine
  DISABLED = 'disabled',                   // Temporarily excluded
  DEPRECATED = 'deprecated',               // Superseded but historical
  ARCHIVED = 'archived'                    // Permanent removal
}

interface StateTransition {
  fromState: PolicyState;
  toState: PolicyState;
  timestamp: Date;
  reason: string;
  triggeredBy: 'system' | 'admin' | 'provider';
  userId?: string;
  automationRule?: string;
}

interface VisibilityControl {
  geographicRestrictions: string[];        // ['NSW', 'VIC'] or []
  demographicFilters: DemographicFilter[];
  seasonalSchedule?: SeasonalSchedule;
  capacityLimits?: CapacityLimits;
}
```

### 2.3 Database Schema Extensions

Extends existing V2 schema from `/docs/database/v2-schema.sql`:

**IMPORTANT**: The V2 schema already includes a `v2_provider_policies` table. We extend it rather than duplicate it.

```sql
-- ============================================================================
-- PROVIDER MANAGEMENT EXTENSIONS (Building on existing V2 schema)
-- ============================================================================

-- ⚠️  NOTE: v2_provider_policies table already exists in V2 schema
-- We extend it with additional columns for provider lifecycle management

-- Provider organizations (NEW TABLE)
CREATE TABLE v2_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code VARCHAR(20) NOT NULL UNIQUE,  -- 'HCF', 'MEDIBANK'
  provider_name VARCHAR(200) NOT NULL,
  
  -- Business information
  license_number VARCHAR(100),
  market_tier VARCHAR(20),                     -- 'major', 'mid-tier', 'specialist'
  contact_info JSONB NOT NULL,                 -- ProviderContactInfo
  commission_info JSONB,                       -- CommissionInfo
  
  -- Onboarding status
  onboarding_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'active', 'suspended'
  onboarded_at TIMESTAMPTZ,
  onboarded_by UUID,                          -- Admin user reference
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_v2_providers_code (provider_code),
  INDEX idx_v2_providers_status (onboarding_status),
  INDEX idx_v2_providers_tier (market_tier)
);

-- Extend existing v2_provider_policies table with provider lifecycle management
ALTER TABLE v2_provider_policies 
  -- Add provider reference (link to new v2_providers table)
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES v2_providers(id),
  
  -- Policy lifecycle management
  ADD COLUMN IF NOT EXISTS state VARCHAR(20) DEFAULT 'active',     -- 'draft', 'active', 'disabled', etc.
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2),             -- 0-100 automated assessment
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
  
  -- Visibility and geographic controls
  ADD COLUMN IF NOT EXISTS visibility_controls JSONB,              -- VisibilityControl
  ADD COLUMN IF NOT EXISTS geographic_restrictions TEXT[],         -- ['NSW', 'VIC']
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  
  -- Data lineage for duplicate detection
  ADD COLUMN IF NOT EXISTS source_file_hash VARCHAR(64),           -- For deduplication
  ADD COLUMN IF NOT EXISTS ingestion_batch_id UUID,                -- Group related uploads
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  
  -- Version management
  ADD COLUMN IF NOT EXISTS supersedes_policy_id UUID REFERENCES v2_provider_policies(id),
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ,
  
  -- Admin tracking
  ADD COLUMN IF NOT EXISTS created_by UUID;                        -- Admin user reference

-- Add new indexes for extended functionality
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_provider_id ON v2_provider_policies(provider_id);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_state ON v2_provider_policies(state);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_quality ON v2_provider_policies(quality_score);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_effective ON v2_provider_policies(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_geographic_gin ON v2_provider_policies USING GIN (geographic_restrictions);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_visibility_gin ON v2_provider_policies USING GIN (visibility_controls);

-- Policy state transition audit log
CREATE TABLE v2_policy_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES v2_provider_policies(id),
  
  from_state VARCHAR(20),
  to_state VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  
  -- Trigger information
  triggered_by VARCHAR(20) NOT NULL,          -- 'system', 'admin', 'provider'
  user_id UUID,                               -- If manually triggered
  automation_rule VARCHAR(100),               -- If system triggered
  
  -- Context
  additional_context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_v2_policy_state_history_policy (policy_id),
  INDEX idx_v2_policy_state_history_timestamp (timestamp),
  INDEX idx_v2_policy_state_history_trigger (triggered_by)
);

-- Ingestion job tracking
CREATE TABLE v2_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES v2_providers(id),
  
  -- Job metadata
  job_type VARCHAR(20) NOT NULL,              -- 'policy_upload', 'pricing_update'
  batch_id UUID NOT NULL,                     -- Groups related files
  source_info JSONB NOT NULL,                 -- File paths, submission method
  
  -- Processing status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress_percentage INTEGER DEFAULT 0,
  error_details TEXT,
  
  -- Results
  policies_processed INTEGER DEFAULT 0,
  policies_created INTEGER DEFAULT 0,
  policies_updated INTEGER DEFAULT 0,
  policies_failed INTEGER DEFAULT 0,
  quality_issues TEXT[],                      -- Array of quality concerns
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_duration INTERVAL,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,                            -- Admin user
  
  -- Indexes
  INDEX idx_v2_ingestion_jobs_provider (provider_id),
  INDEX idx_v2_ingestion_jobs_status (status),
  INDEX idx_v2_ingestion_jobs_batch (batch_id),
  INDEX idx_v2_ingestion_jobs_created (created_at)
);
```

---

## 3. Service Architecture

### 3.1 Provider Management Service

Builds on service abstraction patterns from `/docs/architecture/service-abstractions.md`:

```typescript
// Provider management service interface
interface ProviderManagementService {
  // Provider CRUD operations
  createProvider(providerData: CreateProviderRequest): Promise<Provider>;
  getProvider(providerId: string): Promise<Provider | null>;
  updateProvider(providerId: string, updates: UpdateProviderRequest): Promise<Provider>;
  listProviders(filters?: ProviderFilters): Promise<Provider[]>;
  archiveProvider(providerId: string, reason: string): Promise<void>;
  
  // Provider status management
  activateProvider(providerId: string): Promise<void>;
  suspendProvider(providerId: string, reason: string): Promise<void>;
  
  // Analytics and reporting
  getProviderMetrics(providerId: string, timeRange: TimeRange): Promise<ProviderMetrics>;
  getProviderPerformance(providerId: string): Promise<PerformanceReport>;
}

interface CreateProviderRequest {
  providerCode: string;
  providerName: string;
  contactInfo: ProviderContactInfo;
  licenseNumber: string;
  marketTier: 'major' | 'mid-tier' | 'specialist';
  commissionInfo?: CommissionInfo;
}

interface ProviderFilters {
  marketTier?: string;
  onboardingStatus?: string;
  countries?: string[];
  lastActiveAfter?: Date;
  searchQuery?: string;
}
```

### 3.2 Policy Ingestion Service

```typescript
// Policy ingestion and processing service
interface PolicyIngestionService {
  // File-based ingestion
  ingestPolicyDocuments(
    providerId: string, 
    files: FileUpload[], 
    options?: IngestionOptions
  ): Promise<IngestionJob>;
  
  // Structured data ingestion
  ingestPricingMatrix(
    providerId: string, 
    pricingData: PricingMatrixData
  ): Promise<IngestionResult>;
  
  // Job monitoring
  getIngestionStatus(jobId: string): Promise<IngestionStatus>;
  listIngestionJobs(providerId?: string, filters?: JobFilters): Promise<IngestionJob[]>;
  
  // Quality assessment
  validatePolicyData(policyData: PolicyData): Promise<ValidationResult>;
  assessDataQuality(policyData: PolicyData): Promise<QualityAssessment>;
  
  // Deduplication
  detectDuplicates(policyData: PolicyData): Promise<DuplicationReport>;
  mergeDuplicatePolicy(
    existingPolicyId: string, 
    newPolicyData: PolicyData
  ): Promise<MergeResult>;
}

interface IngestionOptions {
  skipDuplicateDetection?: boolean;
  autoApprove?: boolean;                       // For trusted providers
  qualityThreshold?: number;                   // 0-100, minimum quality score
  notificationSettings?: NotificationConfig;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  confidence: number;
}

interface QualityAssessment {
  overallScore: number;                        // 0-100
  categoryScores: Record<string, number>;      // Feature completeness scores
  missingFields: string[];
  dataQualityIssues: QualityIssue[];
  recommendations: string[];
}
```

### 3.3 Policy Lifecycle Management Service

```typescript
// Policy state and lifecycle management
interface PolicyLifecycleService {
  // State management
  transitionPolicyState(
    policyId: string, 
    toState: PolicyState, 
    reason: string,
    context?: Record<string, any>
  ): Promise<StateTransition>;
  
  // Bulk operations
  bulkStateTransition(
    policyIds: string[], 
    toState: PolicyState, 
    reason: string
  ): Promise<BulkOperationResult>;
  
  // Automated state management
  scheduleStateTransition(
    policyId: string, 
    toState: PolicyState, 
    scheduledTime: Date,
    reason: string
  ): Promise<ScheduledTransition>;
  
  // Policy versioning
  createPolicyVersion(
    basePolicyId: string, 
    updates: PolicyUpdates
  ): Promise<ProviderPolicy>;
  supersedePolicyVersion(
    currentVersionId: string, 
    newVersionId: string
  ): Promise<void>;
  
  // Visibility controls
  updateVisibilityControls(
    policyId: string, 
    controls: VisibilityControl
  ): Promise<void>;
  
  // Compliance and validation
  validatePolicyCompliance(policyId: string): Promise<ComplianceResult>;
  markForReview(policyId: string, reason: string): Promise<void>;
}

interface BulkOperationResult {
  totalRequested: number;
  successful: number;
  failed: number;
  errors: Record<string, string>;             // policyId -> error message
  operationId: string;                       // For tracking
}

interface ComplianceResult {
  isCompliant: boolean;
  regulatoryFramework: string;
  violations: ComplianceViolation[];
  recommendations: string[];
  lastChecked: Date;
}
```

### 3.4 Policy Discovery and Matching Service

```typescript
// Policy discovery for comparison engine
interface PolicyDiscoveryService {
  // Query active policies
  getActivePolicies(
    country: string, 
    filters?: PolicyFilters
  ): Promise<ProviderPolicyFeatures[]>;
  
  // Match policies for comparison
  findMatchingPolicies(
    userPolicyFeatures: AnonymizedUserPolicyFeatures,
    country: string,
    maxResults?: number
  ): Promise<ProviderPolicyFeatures[]>;
  
  // Search and filtering
  searchPolicies(
    searchCriteria: SearchCriteria
  ): Promise<SearchResult>;
  
  // Policy recommendations
  recommendSimilarPolicies(
    basePolicyId: string,
    maxResults?: number
  ): Promise<ProviderPolicyFeatures[]>;
  
  // Market analysis
  getMarketCoverage(country: string): Promise<MarketCoverageReport>;
  analyzePolicyGaps(country: string): Promise<PolicyGapAnalysis>;
}

interface PolicyFilters {
  policyTypes?: string[];
  priceRange?: PriceRange;
  providers?: string[];
  regions?: string[];
  features?: string[];
  excludeFeatures?: string[];
  minimumQuality?: number;
}

interface SearchCriteria {
  query?: string;                             // Text search
  country: string;
  filters?: PolicyFilters;
  sortBy?: 'relevance' | 'price' | 'quality' | 'features';
  sortOrder?: 'asc' | 'desc';
}
```

---

## 4. Processing Pipeline

### 4.1 Document Processing Pipeline

Extends existing document processing from `/lib/services/policy-processor.ts`:

```typescript
// Specialized provider document processor
export class ProviderDocumentProcessor {
  private documentProcessor: DocumentProcessor;
  private llmProvider: LLMProvider;
  private qualityAssessor: QualityAssessmentService;
  
  async processProviderDocuments(
    files: FileUpload[],
    providerId: string,
    options?: ProcessingOptions
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const file of files) {
      try {
        // Extract structured data (no PII concerns for provider docs)
        const documentData = await this.documentProcessor.processDocument(
          file.buffer,
          { enableTableExtraction: true }
        );
        
        // AI analysis for policy features
        const policyFeatures = await this.llmProvider.analyzeFeatures(
          documentData
        );
        
        // Quality assessment
        const qualityScore = await this.qualityAssessor.assessQuality(
          policyFeatures,
          documentData
        );
        
        // Structure as ProviderPolicyFeatures
        const providerPolicy: ProviderPolicyFeatures = {
          ...policyFeatures,
          _context: 'PROVIDER_POLICY',
          _piiStatus: 'NO_PII',
          providerMetadata: await this.getProviderMetadata(providerId),
          effectiveDate: new Date(),
          marketSegment: this.determineMarketSegment(policyFeatures),
          targetDemographics: this.extractTargetDemographics(documentData)
        };
        
        results.push({
          file: file.name,
          status: 'success',
          policyFeatures: providerPolicy,
          qualityScore,
          processingTime: Date.now() - startTime
        });
        
      } catch (error) {
        results.push({
          file: file.name,
          status: 'failed',
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    }
    
    return results;
  }
  
  private async getProviderMetadata(providerId: string): Promise<ProviderMetadata> {
    // Fetch provider information from database
    const provider = await this.providerService.getProvider(providerId);
    return {
      providerId,
      providerCode: provider.code,
      providerName: provider.name,
      licenseNumber: provider.licenseNumber,
      contactInfo: provider.contactInfo,
      commissionStructure: provider.commissionInfo
    };
  }
}
```

### 4.2 Pricing Matrix Processing

```typescript
// Excel/CSV pricing matrix processor
export class PricingMatrixProcessor {
  async processPricingMatrix(
    file: FileUpload,
    providerId: string
  ): Promise<PricingProcessingResult> {
    
    // Parse Excel/CSV file
    const data = await this.parseSpreadsheet(file);
    
    // Validate schema
    const validation = await this.validatePricingSchema(data);
    if (!validation.isValid) {
      throw new Error(`Invalid pricing matrix: ${validation.errors.join(', ')}`);
    }
    
    // Normalize pricing data
    const normalizedPricing = await this.normalizePricingData(data);
    
    // Associate with policies
    const policyMappings = await this.mapPricingToPolicies(
      normalizedPricing,
      providerId
    );
    
    return {
      totalRows: data.length,
      validRows: normalizedPricing.length,
      policyMappings: policyMappings.length,
      pricingData: normalizedPricing,
      validationIssues: validation.warnings
    };
  }
  
  private async normalizePricingData(rawData: any[]): Promise<NormalizedPricing[]> {
    return rawData.map(row => ({
      policyCode: this.extractPolicyCode(row),
      premiumRanges: {
        single: { 
          min: this.parseAmount(row.single_min), 
          max: this.parseAmount(row.single_max) 
        },
        couple: { 
          min: this.parseAmount(row.couple_min), 
          max: this.parseAmount(row.couple_max) 
        },
        family: { 
          min: this.parseAmount(row.family_min), 
          max: this.parseAmount(row.family_max) 
        }
      },
      excessOptions: this.parseExcessOptions(row),
      ageFactors: this.parseAgeFactors(row),
      regionFactors: this.parseRegionFactors(row),
      effectiveDate: this.parseDate(row.effective_date),
      expiryDate: this.parseDate(row.expiry_date)
    }));
  }
}
```

### 4.3 Deduplication Engine

```typescript
// Multi-level duplicate detection
export class PolicyDeduplicationEngine {
  async detectDuplicates(
    policyData: PolicyData,
    providerId?: string
  ): Promise<DuplicationReport> {
    
    const duplicates: DuplicateMatch[] = [];
    
    // Level 1: File hash comparison
    const fileHashMatches = await this.detectFileHashDuplicates(policyData);
    duplicates.push(...fileHashMatches);
    
    // Level 2: Content similarity
    const contentMatches = await this.detectContentDuplicates(policyData);
    duplicates.push(...contentMatches);
    
    // Level 3: Semantic similarity
    const semanticMatches = await this.detectSemanticDuplicates(policyData);
    duplicates.push(...semanticMatches);
    
    // Level 4: Cross-provider duplicate detection
    if (!providerId) {
      const crossProviderMatches = await this.detectCrossProviderDuplicates(policyData);
      duplicates.push(...crossProviderMatches);
    }
    
    return {
      isDuplicate: duplicates.length > 0,
      confidence: this.calculateDuplicationConfidence(duplicates),
      matches: duplicates,
      recommendations: this.generateDuplicationRecommendations(duplicates)
    };
  }
  
  private async detectSemanticDuplicates(
    policyData: PolicyData
  ): Promise<DuplicateMatch[]> {
    // Generate embeddings for policy features
    const policyEmbedding = await this.generatePolicyEmbedding(policyData);
    
    // Search for similar embeddings in database
    const similarPolicies = await this.searchSimilarEmbeddings(
      policyEmbedding,
      0.95 // High similarity threshold
    );
    
    return similarPolicies.map(match => ({
      type: 'semantic',
      confidence: match.similarity,
      existingPolicyId: match.policyId,
      reason: `${Math.round(match.similarity * 100)}% feature similarity`
    }));
  }
}
```

---

## 5. Admin Interface Architecture

### 5.1 Provider Management Dashboard

```typescript
// Admin dashboard service for provider management
interface ProviderDashboardService {
  // Overview metrics
  getProviderOverview(): Promise<ProviderOverviewMetrics>;
  getProviderDirectory(filters?: ProviderFilters): Promise<ProviderDirectoryEntry[]>;
  
  // Policy inventory
  getPolicyInventory(
    providerId?: string, 
    filters?: PolicyInventoryFilters
  ): Promise<PolicyInventoryEntry[]>;
  
  // Ingestion monitoring
  getIngestionQueue(): Promise<IngestionQueueEntry[]>;
  getIngestionMetrics(timeRange: TimeRange): Promise<IngestionMetrics>;
  
  // Quality dashboard
  getQualityMetrics(): Promise<QualityMetrics>;
  getQualityIssues(severity?: 'high' | 'medium' | 'low'): Promise<QualityIssue[]>;
  
  // Performance analytics
  getProviderPerformance(providerId: string): Promise<ProviderPerformanceReport>;
  getMarketCoverageAnalysis(): Promise<MarketCoverageAnalysis>;
}

interface ProviderOverviewMetrics {
  totalProviders: number;
  activeProviders: number;
  pendingOnboarding: number;
  totalPolicies: number;
  activePolicies: number;
  averageQualityScore: number;
  ingestionJobsToday: number;
  issuesRequiringAttention: number;
}

interface PolicyInventoryEntry {
  policyId: string;
  providerId: string;
  providerName: string;
  policyName: string;
  state: PolicyState;
  qualityScore: number;
  lastUpdated: Date;
  issueCount: number;
  conversionRate?: number;                     // If tracking enabled
}
```

### 5.2 Quality Review Workflow

```typescript
// Quality review and approval workflow
interface QualityReviewService {
  // Review queue management
  getReviewQueue(assigneeId?: string): Promise<ReviewQueueEntry[]>;
  assignReview(policyId: string, reviewerId: string): Promise<void>;
  
  // Review actions
  approvePolicyForActivation(
    policyId: string, 
    reviewerId: string,
    notes?: string
  ): Promise<void>;
  
  rejectPolicyWithFeedback(
    policyId: string,
    reviewerId: string,
    feedback: ReviewFeedback
  ): Promise<void>;
  
  requestProviderClarification(
    policyId: string,
    reviewerId: string,
    clarificationRequest: ClarificationRequest
  ): Promise<void>;
  
  // Review analytics
  getReviewMetrics(reviewerId?: string): Promise<ReviewMetrics>;
  getReviewHistory(policyId: string): Promise<ReviewHistoryEntry[]>;
}

interface ReviewQueueEntry {
  policyId: string;
  providerId: string;
  policyName: string;
  submittedAt: Date;
  priority: 'high' | 'medium' | 'low';
  automatedFlags: string[];                   // Quality issues flagged by AI
  assignedReviewer?: string;
  estimatedReviewTime: number;                // Minutes
}

interface ReviewFeedback {
  issueCategories: string[];                  // 'pricing', 'coverage', 'compliance'
  specificIssues: ReviewIssue[];
  recommendedActions: string[];
  severity: 'block' | 'warning' | 'suggestion';
  providerNotification: boolean;
}
```

### 5.3 API Design for Admin Operations

Extends API patterns from existing V2 architecture:

```typescript
// Provider management API endpoints
interface ProviderAdminApi {
  // Provider CRUD
  'POST /api/admin/v2/providers': (data: CreateProviderRequest) => Promise<Provider>;
  'GET /api/admin/v2/providers': (filters?: ProviderFilters) => Promise<Provider[]>;
  'GET /api/admin/v2/providers/:providerId': () => Promise<Provider>;
  'PUT /api/admin/v2/providers/:providerId': (updates: UpdateProviderRequest) => Promise<Provider>;
  'DELETE /api/admin/v2/providers/:providerId': () => Promise<void>;
  
  // Policy management
  'GET /api/admin/v2/providers/:providerId/policies': (filters?: PolicyFilters) => Promise<ProviderPolicy[]>;
  'POST /api/admin/v2/providers/:providerId/policies/upload': (files: FileUpload[]) => Promise<IngestionJob>;
  'PUT /api/admin/v2/policies/:policyId': (updates: PolicyUpdates) => Promise<ProviderPolicy>;
  'POST /api/admin/v2/policies/:policyId/state': (transition: StateTransitionRequest) => Promise<StateTransition>;
  
  // Bulk operations
  'POST /api/admin/v2/policies/bulk-state-change': (request: BulkStateChangeRequest) => Promise<BulkOperationResult>;
  'POST /api/admin/v2/policies/bulk-visibility': (request: BulkVisibilityRequest) => Promise<BulkOperationResult>;
  
  // Ingestion management
  'POST /api/admin/v2/ingestion/trigger': (request: ManualIngestionRequest) => Promise<IngestionJob>;
  'GET /api/admin/v2/ingestion/jobs': (filters?: JobFilters) => Promise<IngestionJob[]>;
  'GET /api/admin/v2/ingestion/jobs/:jobId': () => Promise<IngestionJobDetails>;
  
  // Quality and review
  'GET /api/admin/v2/review/queue': (assignee?: string) => Promise<ReviewQueueEntry[]>;
  'POST /api/admin/v2/review/:policyId/approve': (reviewData: ReviewApproval) => Promise<void>;
  'POST /api/admin/v2/review/:policyId/reject': (reviewData: ReviewRejection) => Promise<void>;
  
  // Analytics and reporting
  'GET /api/admin/v2/analytics/providers': (timeRange?: TimeRange) => Promise<ProviderAnalytics>;
  'GET /api/admin/v2/analytics/quality': (filters?: QualityFilters) => Promise<QualityAnalytics>;
  'GET /api/admin/v2/analytics/market-coverage': (country: string) => Promise<MarketCoverageReport>;
}
```

---

## 6. Security and Access Control

### 6.1 Authentication and Authorization

Building on security patterns from `/docs/security/pii-protection-architecture.md`:

```typescript
// Role-based access control for provider management
interface ProviderAccessControl {
  roles: {
    'provider-admin': {
      permissions: [
        'create:provider',
        'read:all-providers', 
        'update:provider',
        'delete:provider',
        'manage:policies',
        'approve:policies',
        'access:analytics'
      ];
    };
    'provider-reviewer': {
      permissions: [
        'read:assigned-reviews',
        'approve:policies',
        'reject:policies',
        'request:clarification'
      ];
    };
    'provider-operator': {
      permissions: [
        'read:providers',
        'read:policies',
        'trigger:ingestion',
        'update:policy-state'
      ];
    };
    'provider-viewer': {
      permissions: [
        'read:providers',
        'read:policies',
        'read:analytics'
      ];
    };
  };
}

// Token-based authentication service
interface ProviderAuthService {
  // API key management
  generateApiKey(userId: string, role: string, expiresIn?: string): Promise<ApiKey>;
  validateApiKey(key: string): Promise<AuthContext | null>;
  revokeApiKey(keyId: string): Promise<void>;
  
  // Session management
  createSession(userId: string, role: string): Promise<SessionToken>;
  validateSession(token: string): Promise<SessionContext | null>;
  refreshSession(token: string): Promise<SessionToken>;
  
  // Audit logging
  logAccess(context: AuthContext, resource: string, action: string): Promise<void>;
  getAccessAudit(userId?: string, timeRange?: TimeRange): Promise<AccessAuditEntry[]>;
}
```

### 6.2 Data Protection

```typescript
// Provider data security measures
interface ProviderDataSecurity {
  // Commercial data protection
  encryptCommercialData(data: CommercialData): Promise<EncryptedData>;
  decryptCommercialData(encrypted: EncryptedData): Promise<CommercialData>;
  
  // Audit trail protection
  createImmutableAuditRecord(record: AuditRecord): Promise<void>;
  verifyAuditIntegrity(recordId: string): Promise<IntegrityResult>;
  
  // Data retention management
  scheduleDataRetention(dataType: string, retentionPeriod: string): Promise<void>;
  executeRetentionPolicy(policyId: string): Promise<RetentionResult>;
  
  // Compliance monitoring
  scanForComplianceViolations(): Promise<ComplianceViolation[]>;
  generateComplianceReport(timeRange: TimeRange): Promise<ComplianceReport>;
}
```

---

## 7. Integration Points

### 7.1 Integration with Existing V2 System

```typescript
// Integration service for provider policies with user analysis
export class ProviderIntegrationService {
  
  // Connect provider policies to comparison engine
  async getComparablePolicies(
    userPolicyFeatures: AnonymizedUserPolicyFeatures,
    country: string
  ): Promise<ProviderPolicyFeatures[]> {
    
    // Query active provider policies
    const activePolicies = await this.policyDiscoveryService.getActivePolicies(
      country,
      {
        // Filter based on user policy characteristics
        policyTypes: [userPolicyFeatures.classification.primaryType],
        regions: userPolicyFeatures.metadata.availableRegions
      }
    );
    
    // Apply visibility controls
    const visiblePolicies = await this.applyVisibilityControls(
      activePolicies,
      this.extractUserDemographics(userPolicyFeatures)
    );
    
    // Rank by relevance
    return await this.rankPoliciesByRelevance(
      visiblePolicies,
      userPolicyFeatures
    );
  }
  
  // Update provider policies in comparison cache
  async refreshComparisonCache(policyId: string): Promise<void> {
    const policy = await this.policyService.getPolicy(policyId);
    
    if (policy && policy.state === PolicyState.ACTIVE) {
      // Update cached policy data for comparison engine
      await this.comparisonCacheService.updatePolicy(policy);
      
      // Trigger recomputation of affected user analyses
      await this.recomputationService.scheduleRecomputation(
        policy.features.country,
        policy.features.classification.primaryType
      );
    }
  }
}
```

### 7.2 Notification and Communication

```typescript
// Provider notification service
interface ProviderNotificationService {
  // Provider communication
  notifyProviderOfIssues(
    providerId: string,
    issues: QualityIssue[]
  ): Promise<NotificationResult>;
  
  notifyProviderOfApproval(
    providerId: string,
    approvedPolicies: string[]
  ): Promise<NotificationResult>;
  
  sendProviderPerformanceReport(
    providerId: string,
    report: PerformanceReport
  ): Promise<NotificationResult>;
  
  // Admin notifications
  notifyAdminOfReviewNeeded(
    policyId: string,
    priority: 'high' | 'medium' | 'low'
  ): Promise<NotificationResult>;
  
  notifyAdminOfSystemIssues(
    issues: SystemIssue[]
  ): Promise<NotificationResult>;
  
  // Automated alerts
  scheduleDataFreshnessAlerts(providerId: string): Promise<void>;
  alertOnQualityThresholdViolation(policyId: string): Promise<void>;
}
```

---

## 8. Performance and Scalability

### 8.1 Optimization Strategies

```typescript
// Performance optimization for provider operations
interface ProviderPerformanceOptimization {
  // Caching strategies
  cacheProviderPolicies(providerId: string): Promise<void>;
  invalidatePolicyCache(policyId: string): Promise<void>;
  warmupComparisonCache(country: string): Promise<void>;
  
  // Batch processing
  processPoliciesInBatches(
    policyIds: string[], 
    batchSize: number
  ): Promise<BatchProcessingResult>;
  
  // Background processing
  scheduleAsyncProcessing(
    job: ProcessingJob,
    priority: 'high' | 'medium' | 'low'
  ): Promise<JobId>;
  
  // Query optimization
  optimizeProviderQueries(): Promise<QueryOptimizationResult>;
  createOptimalIndexes(): Promise<IndexCreationResult>;
}
```

### 8.2 Monitoring and Metrics

```typescript
// Comprehensive monitoring for provider system
interface ProviderMonitoringService {
  // Performance metrics
  trackIngestionPerformance(jobId: string, metrics: PerformanceMetrics): Promise<void>;
  trackQualityAssessmentPerformance(policyId: string, duration: number): Promise<void>;
  trackQueryPerformance(queryType: string, duration: number): Promise<void>;
  
  // Business metrics
  trackProviderOnboardingProgress(providerId: string, stage: string): Promise<void>;
  trackPolicyActivationRate(timeRange: TimeRange): Promise<ActivationRateMetrics>;
  trackQualityTrends(timeRange: TimeRange): Promise<QualityTrendMetrics>;
  
  // System health
  monitorSystemHealth(): Promise<SystemHealthReport>;
  alertOnThresholdViolation(metric: string, threshold: number): Promise<void>;
  
  // Cost tracking
  trackProcessingCosts(operation: string, cost: number): Promise<void>;
  generateCostReport(timeRange: TimeRange): Promise<CostReport>;
}
```

---

## 9. Testing Strategy

### 9.1 Provider Data Testing

```typescript
// Testing framework for provider operations
interface ProviderTestingFramework {
  // Data quality testing
  testPolicyDataQuality(testData: PolicyTestData): Promise<QualityTestResult>;
  testDeduplicationAccuracy(duplicateTestCases: DuplicateTestCase[]): Promise<DeduplicationTestResult>;
  
  // Integration testing
  testProviderOnboardingFlow(providerTestData: ProviderTestData): Promise<IntegrationTestResult>;
  testPolicyLifecycleManagement(policyTestData: PolicyTestData): Promise<LifecycleTestResult>;
  
  // Performance testing
  testIngestionPerformance(loadTestConfig: LoadTestConfig): Promise<PerformanceTestResult>;
  testConcurrentProviderOperations(concurrencyLevel: number): Promise<ConcurrencyTestResult>;
  
  // Security testing
  testAccessControls(securityTestSuite: SecurityTestSuite): Promise<SecurityTestResult>;
  testDataProtection(dataProtectionTests: DataProtectionTest[]): Promise<DataProtectionTestResult>;
}
```

---

## 10. Migration and Deployment

### 10.1 Database Migration Strategy

```sql
-- Migration script for provider policy management
-- Version: 2.1.0 - Provider Policy Management Extensions

-- ⚠️  IMPORTANT: This migration extends existing V2 schema, does not replace it

-- Step 1: Create new v2_providers table (extends existing schema)
CREATE TABLE v2_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code VARCHAR(20) NOT NULL UNIQUE,
  provider_name VARCHAR(200) NOT NULL,
  license_number VARCHAR(100),
  market_tier VARCHAR(20),
  contact_info JSONB NOT NULL,
  commission_info JSONB,
  onboarding_status VARCHAR(20) DEFAULT 'pending',
  onboarded_at TIMESTAMPTZ,
  onboarded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Extend existing v2_provider_policies table (DO NOT recreate)
ALTER TABLE v2_provider_policies 
  ADD COLUMN IF NOT EXISTS provider_id UUID,
  ADD COLUMN IF NOT EXISTS state VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visibility_controls JSONB,
  ADD COLUMN IF NOT EXISTS geographic_restrictions TEXT[],
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_file_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ingestion_batch_id UUID,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supersedes_policy_id UUID,
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Step 3: Add foreign key constraint after data migration
ALTER TABLE v2_provider_policies 
  ADD CONSTRAINT fk_provider_policies_provider 
  FOREIGN KEY (provider_id) REFERENCES v2_providers(id);

-- Step 4: Migrate existing provider data from JSONB to structured table
INSERT INTO v2_providers (provider_code, provider_name, contact_info, market_tier, onboarding_status)
SELECT DISTINCT
  provider_code,
  COALESCE(provider_info->>'name', provider_code) as provider_name,
  COALESCE(provider_info->>'contact_info', '{}') as contact_info,
  'major' as market_tier,  -- Default value, can be updated later
  'active' as onboarding_status
FROM v2_provider_policies
WHERE provider_code IS NOT NULL
ON CONFLICT (provider_code) DO NOTHING;

-- Step 5: Update existing policies with provider_id references
UPDATE v2_provider_policies pp
SET provider_id = p.id
FROM v2_providers p
WHERE pp.provider_code = p.provider_code
AND pp.provider_id IS NULL;

-- Step 6: Create new indexes for extended functionality
CREATE INDEX CONCURRENTLY idx_v2_provider_policies_provider_id ON v2_provider_policies(provider_id);
CREATE INDEX CONCURRENTLY idx_v2_provider_policies_state ON v2_provider_policies(state);
CREATE INDEX CONCURRENTLY idx_v2_provider_policies_compound_search 
  ON v2_provider_policies (country_code, policy_type, state) 
  WHERE state = 'active';

-- Step 7: Set up automated maintenance jobs
-- (Background job configurations for cleanup and monitoring)
```

### 10.2 Deployment Configuration

```typescript
// Environment-specific provider management configuration
export const PROVIDER_CONFIG = {
  development: {
    ingestion: {
      maxConcurrentJobs: 2,
      maxFileSize: '10MB',
      allowedFileTypes: ['.pdf', '.xlsx', '.csv'],
      autoApprovalThreshold: 0.95
    },
    quality: {
      minimumQualityScore: 0.7,
      requireManualReview: true,
      duplicationThreshold: 0.9
    },
    notifications: {
      enableProviderNotifications: true,
      adminNotificationEmail: 'admin@poco.ai',
      notificationDelay: '5 minutes'
    }
  },
  
  production: {
    ingestion: {
      maxConcurrentJobs: 10,
      maxFileSize: '50MB', 
      allowedFileTypes: ['.pdf', '.xlsx', '.csv'],
      autoApprovalThreshold: 0.98
    },
    quality: {
      minimumQualityScore: 0.85,
      requireManualReview: false,  // For trusted providers
      duplicationThreshold: 0.95
    },
    notifications: {
      enableProviderNotifications: true,
      adminNotificationEmail: 'operations@poco.ai',
      notificationDelay: '1 minute'
    }
  }
};
```

---

## 11. Success Metrics and KPIs

### 11.1 Operational Excellence Metrics

```typescript
interface ProviderSuccessMetrics {
  // Time efficiency
  averageOnboardingTime: number;               // Target: <72 hours
  averageIngestionTime: number;                // Target: <30 minutes
  averageReviewTime: number;                   // Target: <4 hours
  
  // Quality metrics  
  automationRate: number;                      // Target: >80%
  qualityPassRate: number;                     // Target: >90%
  duplicationDetectionAccuracy: number;        // Target: >95%
  
  // Business impact
  providerSatisfactionScore: number;           // Target: >4.0/5.0
  policyDatabaseGrowthRate: number;           // Target: 20% monthly
  marketCoveragePercentage: number;           // Target: >80%
  
  // System performance
  systemUptime: number;                       // Target: >99.9%
  apiResponseTime: number;                    // Target: <500ms
  errorRate: number;                          // Target: <1%
}
```

---

This comprehensive technical architecture provides the foundation for implementing scalable, secure, and efficient provider policy management within the existing V2 system. The design maintains consistency with established patterns while introducing specialized capabilities for provider onboarding and lifecycle management.