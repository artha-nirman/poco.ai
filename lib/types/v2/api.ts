/**
 * V2 Analysis Request and Response Types
 * Country-aware interfaces for the policy analysis API
 */

// ============================================================================
// REQUEST TYPES  
// ============================================================================

export interface V2AnalysisRequest {
  policy_text: string;
  policy_type?: 'health' | 'car' | 'home' | 'life' | 'travel';
  provider_name?: string;
  user_preferences?: {
    privacy_level: 'basic' | 'standard' | 'enhanced';
    analysis_depth: 'quick' | 'standard' | 'comprehensive';
    include_comparison: boolean;
    highlight_concerns: boolean;
  };
  request_metadata?: {
    timestamp: string;
    user_agent?: string;
    ip_country?: string;
    session_id: string;
  };
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface V2AnalysisResponse {
  analysis_id: string;
  country: string;
  country_name: string;
  policy: V2PolicyAnalysis;
  insights: V2PolicyInsights;
  comparison?: V2ComparisonData;
  metadata: V2ResponseMetadata;
}

export interface V2PolicyAnalysis {
  type: string;
  provider?: string;
  confidence: number;
  features: Record<string, any>;              // Country-adapted features
  regulatory_compliance: V2RegulatoryCompliance;
  risk_assessment: V2RiskAssessment;
}

export interface V2PolicyInsights {
  key_benefits: string[];
  potential_concerns: string[];
  coverage_gaps: string[];
  cost_factors: string[];
  recommendations: string[];
  regulatory_insights?: V2RegulatoryInsights;
  cost_insights?: V2CostInsights;
}

export interface V2ComparisonData {
  market_position: 'poor' | 'below_average' | 'average' | 'above_average' | 'excellent';
  similar_products: V2SimilarProduct[];
  regulatory_compliance_score: number;
  country_specific_notes: string[];
}

export interface V2ResponseMetadata {
  processing_time_ms: number;
  api_version: string;
  country_config_version: string;
  privacy_level: string;
  pii_protection_applied: boolean;
  completed_at?: string;
  expires_at?: string;
}

// ============================================================================
// DETAILED ANALYSIS TYPES
// ============================================================================

export interface V2RegulatoryCompliance {
  score: number;                              // 0-100
  level: 'non_compliant' | 'basic' | 'standard' | 'enhanced';
  framework: string;
  violations: V2ComplianceViolation[];
  recommendations: string[];
  country_requirements: string[];
}

export interface V2ComplianceViolation {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  regulatory_reference?: string;
  remediation_required: boolean;
}

export interface V2RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high' | 'very_high';
  risk_factors: V2RiskFactor[];
  consumer_protections: string[];
  recommended_actions: string[];
}

export interface V2RiskFactor {
  type: 'coverage' | 'cost' | 'regulatory' | 'provider' | 'market';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  mitigation?: string;
}

export interface V2RegulatoryInsights {
  compliance_level: 'basic' | 'standard' | 'enhanced';
  country_specific_requirements: string[];
  regulatory_warnings: string[];
  framework_version: string;
}

export interface V2CostInsights {
  currency: string;
  tax_implications: Record<string, any>;
  local_cost_factors: string[];
  price_positioning?: 'budget' | 'mid_range' | 'premium';
}

export interface V2SimilarProduct {
  product_name: string;
  provider: string;
  similarity_score: number;
  key_differences: string[];
  price_comparison?: 'cheaper' | 'similar' | 'more_expensive';
}

// ============================================================================
// PROCESSING TYPES
// ============================================================================

export interface V2ProcessingStage {
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
  country_context?: Record<string, any>;
}

export interface V2SessionProgress {
  session_id: string;
  country: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  current_stage: string;
  stages: V2ProcessingStage[];
  estimated_completion?: string;
  started_at: string;
  last_updated: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface V2ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  country?: string;
  session_id?: string;
  error_code?: string;
  suggestions?: string[];
  retry_after?: number;
}

export interface V2ValidationError {
  field: string;
  code: string;
  message: string;
  received_value?: any;
  expected_type?: string;
}

// ============================================================================
// EXPORT TYPES  
// ============================================================================

export interface V2ExportOptions {
  formats: ('json' | 'pdf' | 'csv' | 'xlsx')[];
  pdf_url?: string;
  csv_url?: string;
  xlsx_url?: string;
  share_url?: string;
  expiry_date: string;
}

export interface V2ShareableAnalysis {
  analysis_id: string;
  country: string;
  share_token: string;
  expires_at: string;
  privacy_level: 'public' | 'restricted' | 'private';
  allowed_viewers?: string[];
  summary: V2AnalysisSummary;
}

export interface V2AnalysisSummary {
  policy_type: string;
  provider?: string;
  overall_score: number;
  key_highlights: string[];
  major_concerns: string[];
  recommendation_summary: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type V2SupportedCountry = 'AU' | 'SG' | 'NZ';
export type V2PolicyType = 'health' | 'car' | 'home' | 'life' | 'travel';
export type V2PrivacyLevel = 'basic' | 'standard' | 'enhanced';
export type V2AnalysisDepth = 'quick' | 'standard' | 'comprehensive';

// Type guards
export function isV2SupportedCountry(country: string): country is V2SupportedCountry {
  return ['AU', 'SG', 'NZ'].includes(country.toUpperCase());
}

export function isV2PolicyType(type: string): type is V2PolicyType {
  return ['health', 'car', 'home', 'life', 'travel'].includes(type.toLowerCase());
}

export function isV2PrivacyLevel(level: string): level is V2PrivacyLevel {
  return ['basic', 'standard', 'enhanced'].includes(level.toLowerCase());
}