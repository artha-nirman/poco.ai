/**
 * V2 Type Definitions - Country-Agnostic Flexible System
 * Supports the new JSONB-based schema for multiple regulatory frameworks
 */

// ============================================================================
// Country Configuration Types
// ============================================================================

export interface CountryConfiguration {
  country: {
    code: string;           // 'AU', 'SG', 'NZ'
    name: string;           // 'Australia', 'Singapore', 'New Zealand'
    currency: string;       // 'AUD', 'SGD', 'NZD'
    regulatory_framework: string; // 'Australian Privacy Act 1988', etc.
  };
  
  policy_types: Array<{
    id: string;             // 'hospital', 'extras', 'combined'
    name: string;           // 'Hospital Cover', 'Extras Cover', etc.
    description: string;
    required_features: string[];
    optional_features: string[];
  }>;
  
  policy_tiers: Array<{
    id: string;             // 'basic', 'bronze', 'silver', 'gold'
    name: string;           // 'Basic Hospital', 'Bronze Plus', etc.
    description: string;
    min_coverage: string[];
    typical_features: string[];
  }>;
  
  coverage_categories: Array<{
    id: string;             // 'emergency', 'preventive', 'specialist'
    name: string;           // 'Emergency Care', 'Preventive Services'
    description: string;
    subcategories: string[];
  }>;
  
  providers: Array<{
    code: string;           // 'HCF', 'MEDIBANK', 'BUPA'
    name: string;           // 'HCF Insurance', 'Medibank Private'
    website: string;
    contact_info: {
      phone: string;
      email: string;
    };
  }>;
  
  validation_rules: {
    premium_ranges: {
      single: { min: number; max: number };
      couple: { min: number; max: number };
      family: { min: number; max: number };
    };
    excess_ranges: number[];
    mandatory_waiting_periods: Record<string, string>;
    regulatory_requirements: string[];
  };
  
  ui_preferences: {
    default_comparison_count: number;
    highlight_features: string[];
    currency_display: string;        // '$AUD', 'S$', 'NZ$'
    date_format: string;            // 'DD/MM/YYYY', etc.
  };
}

// ============================================================================
// Policy Features Structure
// ============================================================================

export interface PolicyFeatures {
  [categoryId: string]: {
    included: string[];
    excluded: string[];
    limitations: string[];
    waiting_periods: Record<string, string>;
  };
}

// Recommendation Structure
export interface Recommendation {
  provider: {
    code: string;
    name: string;
    tier: string;
  };
  policy: {
    name: string;
    type: string;
    tier: string;
  };
  premium: {
    amount: number;
    currency: string;
    frequency: string;
    family_type: string;
  };
  features: PolicyFeatures;
  score: {
    overall: number;
    cost: number;
    coverage: number;
    provider_reputation: number;
  };
  cost_analysis: {
    premium_difference: {
      amount: number;
      percentage: number;
      annual_savings: number;
    };
    excess_comparison: {
      current_excess: number;
      recommended_excess: number;
      excess_difference: number;
    };
    total_cost_comparison: {
      current_annual_cost: number;
      recommended_annual_cost: number;
      potential_savings: number;
    };
  };
  switching_considerations: {
    waiting_periods_impact: string[];
    pre_existing_conditions: string[];
    current_benefits_to_lose: string[];
    recommended_timing: string;
  };
}

// ============================================================================
// V2 Analysis Request/Response Types
// ============================================================================

export interface V2AnalysisRequest {
  policy_text: string;
  user_preferences?: {
    max_premium?: number;
    preferred_providers?: string[];
    must_have_features?: string[];
    comparison_count?: number;
  };
  analysis_options?: {
    include_cost_comparison?: boolean;
    include_feature_gap_analysis?: boolean;
    include_provider_recommendations?: boolean;
    priority_weights?: {
      cost: number;
      coverage: number;
      provider_reputation: number;
      customer_service: number;
    };
  };
}

export interface V2AnalysisResponse {
  session_id: string;
  country_code: string;
  analysis_metadata: {
    analyzed_at: string;
    confidence_score: number;
    processing_time_ms: number;
    ai_model_used: string;
  };
  
  user_policy: {
    detected_type: string;          // 'hospital', 'extras', 'combined'
    detected_tier: string;          // 'basic', 'bronze', 'silver', 'gold'
    current_premium: {
      amount: number;
      currency: string;
      frequency: string;            // 'monthly', 'annually'
      family_type: string;          // 'single', 'couple', 'family'
    };
    
    features: {
      [category_id: string]: {
        included: string[];
        excluded: string[];
        limitations: string[];
        waiting_periods: Record<string, string>;
      };
    };
    
    excess_info: {
      hospital_excess: number;
      extras_excess?: number;
      co_payments: Record<string, number>;
    };
    
    provider_info: {
      current_provider: string;
      policy_name: string;
      policy_number?: string;       // PII-sensitive, may be anonymized
      start_date?: string;
      renewal_date?: string;
    };
  };
  
  recommendations: Array<{
    provider: {
      code: string;
      name: string;
      contact_info: {
        phone: string;
        website: string;
      };
    };
    
    policy: {
      name: string;
      type: string;
      tier: string;
      premium: {
        amount: number;
        currency: string;
        frequency: string;
        family_type: string;
      };
    };
    
    comparison_scores: {
      overall_score: number;        // 0-100
      cost_score: number;           // 0-100
      coverage_score: number;       // 0-100
      provider_score: number;       // 0-100
      feature_match_score: number;  // 0-100
    };
    
    feature_comparison: {
      [category_id: string]: {
        current_coverage: string[];
        recommended_coverage: string[];
        improvements: string[];
        gaps: string[];
      };
    };
    
    cost_analysis: {
      premium_difference: {
        amount: number;
        percentage: number;
        annual_savings: number;
      };
      excess_comparison: {
        current_excess: number;
        recommended_excess: number;
        excess_difference: number;
      };
      total_cost_comparison: {
        current_annual_cost: number;
        recommended_annual_cost: number;
        potential_savings: number;
      };
    };
    
    switching_considerations: {
      waiting_periods_impact: string[];
      pre_existing_conditions: string[];
      current_benefits_to_lose: string[];
      recommended_timing: string;
    };
  }>;
  
  summary: {
    best_overall_recommendation: number;  // Index in recommendations array
    potential_annual_savings: number;
    key_improvements: string[];
    important_considerations: string[];
    next_steps: string[];
  };
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface V2SessionData {
  session_id: string;
  country_code: string;
  channel: 'web' | 'email';
  status: 'created' | 'processing' | 'completed' | 'failed' | 'expired';
  countryConfiguration: CountryConfiguration;
  
  input_metadata?: {
    file_info?: {
      original_filename: string;
      file_size: number;
      mime_type: string;
      blob_url: string;
    };
    text_input?: {
      character_count: number;
      detected_language: string;
    };
    user_preferences?: V2AnalysisRequest['user_preferences'];
  };
  
  processing_state?: {
    current_stage: string;
    progress_percentage: number;
    estimated_completion: string;
    stages_completed: string[];
    error_details?: string;
  };
  
  analysis_results?: V2AnalysisResponse;
  
  metadata: {
    created_at: string;
    updated_at: string;
    expires_at: string;
    ip_address?: string;
    user_agent?: string;
  };
}

export interface V2SessionProgress {
  session_id: string;
  stage: string;
  progress: number;              // 0-100
  message: string;
  stages: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    started_at?: string;
    completed_at?: string;
    error?: string;
  }>;
  estimated_time_remaining?: number; // seconds
  error?: string;
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface V2ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
    suggestion?: string;
  };
  session_id?: string;
  timestamp: string;
  country_code?: string;
}

// ============================================================================
// PII Protection Types (V2 Enhanced)
// ============================================================================

export interface V2PIIDetectionResult {
  session_id: string;
  pii_detected: boolean;
  detection_confidence: number;
  anonymized_content: string;
  encryption_key?: string;
  
  detected_items?: Array<{
    type: string;                 // 'policy_number', 'member_id', 'phone', 'email'
    confidence: number;
    anonymized_token: string;     // '[POLICY_NUMBER_1]', '[EMAIL_1]'
    country_specific_handling: {
      retention_period: string;
      encryption_required: boolean;
      audit_logging: boolean;
    };
  }>;
  
  compliance_info: {
    regulatory_framework: string;
    retention_policy: string;
    user_rights: string[];
    data_processing_basis: string;
  };
}

// ============================================================================
// Export All Types
// ============================================================================

// Types are now exported from v2/api.ts and v2/index.ts to avoid conflicts