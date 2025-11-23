-- Poco.ai V2 Database Schema - Complete Unified Schema
-- Country-agnostic, JSONB-based design for flexible policy analysis
-- Compliant with Australian Privacy Act 1988

-- ============================================================================
-- 🎯 V2 UNIFIED SCHEMA - Complete & Production Ready
-- ============================================================================
-- 
-- This schema provides complete V2 functionality:
-- ✅ Country-agnostic session management 
-- ✅ Flexible policy analysis with JSONB
-- ✅ Provider lifecycle management
-- ✅ Audit trails and compliance
-- ✅ Performance optimized indexes
-- ✅ Auto-cleanup procedures
--
-- Compatible with:
-- - V2DatabaseSessionStore
-- - ProviderPolicyService  
-- - ProviderManagementService
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. V2 USER SESSIONS - Core Session Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_user_sessions (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  
  -- Country context
  country_code TEXT NOT NULL,
  country_name TEXT,
  
  -- Session state
  status TEXT NOT NULL DEFAULT 'created',
  progress_percentage INTEGER DEFAULT 0,
  current_stage TEXT DEFAULT 'initializing',
  stages JSONB,
  estimated_completion TIMESTAMPTZ,
  
  -- Input data
  policy_text TEXT,
  policy_type TEXT,
  provider_name TEXT,
  user_preferences JSONB,
  request_metadata JSONB,
  
  -- Processing results
  analysis_results JSONB,
  
  -- Error handling
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Performance tracking
  processing_time_ms INTEGER,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('created', 'queued', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- ============================================================================
-- 2. V2 POLICY ANALYSIS - Analysis Results Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_policy_analysis (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id TEXT UNIQUE NOT NULL,
  session_id TEXT NOT NULL REFERENCES v2_user_sessions(session_id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  
  -- Analysis data
  policy_analysis JSONB NOT NULL,
  insights JSONB NOT NULL,
  comparison_data JSONB,
  recommendations JSONB,
  export_options JSONB,
  regulatory_compliance JSONB,
  risk_assessment JSONB,
  
  -- Metadata
  analysis_version TEXT,
  confidence_score DECIMAL(5,2),
  processing_time_ms INTEGER,
  api_version TEXT,
  country_config_version TEXT,
  privacy_level TEXT,
  
  -- Access tracking
  accessed_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ============================================================================
-- 3. V2 COUNTRY CONFIGURATIONS - Multi-Country Support
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_country_configurations (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  
  -- Configuration data
  configuration JSONB NOT NULL,
  
  -- Metadata
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. V2 PROVIDERS - Provider Organization Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_providers (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(255) NOT NULL,
  provider_code VARCHAR(100) UNIQUE NOT NULL,
  
  -- Organization details
  business_details JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  
  -- Lifecycle management
  onboarding_status VARCHAR(50) DEFAULT 'pending',
  onboarding_notes TEXT,
  quality_metrics JSONB DEFAULT '{}',
  lifecycle_info JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_onboarding_status CHECK (
    onboarding_status IN ('pending', 'in_progress', 'active', 'suspended', 'inactive')
  )
);

-- ============================================================================
-- 5. V2 PROVIDER POLICIES - Flexible Policy Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_provider_policies (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES v2_providers(id),
  provider_code VARCHAR(100) NOT NULL,
  policy_name VARCHAR(255) NOT NULL,
  policy_type VARCHAR(50) NOT NULL,
  policy_tier VARCHAR(50),
  country_code VARCHAR(3) NOT NULL DEFAULT 'AU',
  
  -- Flexible policy structure (JSONB for country-agnostic storage)
  policy_features JSONB DEFAULT '{}',
  pricing_info JSONB DEFAULT '{}',
  coverage_categories JSONB DEFAULT '{}',
  waiting_periods JSONB DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',
  
  -- Lifecycle management
  state VARCHAR(50) DEFAULT 'active',
  quality_score DECIMAL(3,2) DEFAULT 0.8,
  last_validated_at TIMESTAMPTZ,
  
  -- Effective date management
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  
  -- Geographic restrictions
  geographic_restrictions TEXT[],
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Constraints
  CONSTRAINT valid_policy_state CHECK (
    state IN ('draft', 'pending_review', 'active', 'disabled', 'deprecated', 'archived')
  ),
  CONSTRAINT valid_quality_score CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
  
  -- Unique constraint for provider-policy-country combination
  UNIQUE(provider_code, policy_name, country_code)
);

-- ============================================================================
-- 6. V2 POLICY STATE HISTORY - Audit Trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_policy_state_history (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES v2_provider_policies(id) ON DELETE CASCADE,
  
  -- State change tracking
  old_state VARCHAR(50),
  new_state VARCHAR(50) NOT NULL,
  change_reason TEXT,
  changed_by VARCHAR(255),
  
  -- Change metadata
  change_metadata JSONB,
  
  -- Timestamp (immutable)
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES - Performance Optimization
-- ============================================================================

-- V2 User Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_session_id ON v2_user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_country_code ON v2_user_sessions(country_code);
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_status ON v2_user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_expires_at ON v2_user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_started_at ON v2_user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_last_updated ON v2_user_sessions(last_updated);

-- JSONB indexes for flexible queries
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_analysis_results_gin ON v2_user_sessions USING GIN (analysis_results);
CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_user_preferences_gin ON v2_user_sessions USING GIN (user_preferences);

-- V2 Policy Analysis Indexes
CREATE INDEX IF NOT EXISTS idx_v2_policy_analysis_session_id ON v2_policy_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_v2_policy_analysis_analysis_id ON v2_policy_analysis(analysis_id);
CREATE INDEX IF NOT EXISTS idx_v2_policy_analysis_country_code ON v2_policy_analysis(country_code);
CREATE INDEX IF NOT EXISTS idx_v2_policy_analysis_expires_at ON v2_policy_analysis(expires_at);

-- V2 Country Configurations Indexes
CREATE INDEX IF NOT EXISTS idx_v2_country_configurations_country_code ON v2_country_configurations(country_code);
CREATE INDEX IF NOT EXISTS idx_v2_country_configurations_is_active ON v2_country_configurations(is_active);

-- V2 Providers Indexes
CREATE INDEX IF NOT EXISTS idx_v2_providers_provider_code ON v2_providers(provider_code);
CREATE INDEX IF NOT EXISTS idx_v2_providers_onboarding_status ON v2_providers(onboarding_status);

-- V2 Provider Policies Indexes
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_provider_code ON v2_provider_policies(provider_code);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_country_code ON v2_provider_policies(country_code);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_policy_type ON v2_provider_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_is_active ON v2_provider_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_state ON v2_provider_policies(state);

-- JSONB indexes for provider policies
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_features_gin ON v2_provider_policies USING GIN (policy_features);
CREATE INDEX IF NOT EXISTS idx_v2_provider_policies_pricing_gin ON v2_provider_policies USING GIN (pricing_info);

-- V2 Policy State History Indexes
CREATE INDEX IF NOT EXISTS idx_v2_policy_state_history_policy_id ON v2_policy_state_history(policy_id);
CREATE INDEX IF NOT EXISTS idx_v2_policy_state_history_changed_at ON v2_policy_state_history(changed_at);

-- ============================================================================
-- TRIGGERS - Automatic Updates
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS trigger_v2_user_sessions_updated_at ON v2_user_sessions;
CREATE TRIGGER trigger_v2_user_sessions_updated_at
  BEFORE UPDATE ON v2_user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_v2_policy_analysis_updated_at ON v2_policy_analysis;
CREATE TRIGGER trigger_v2_policy_analysis_updated_at
  BEFORE UPDATE ON v2_policy_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_v2_country_configurations_updated_at ON v2_country_configurations;
CREATE TRIGGER trigger_v2_country_configurations_updated_at
  BEFORE UPDATE ON v2_country_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_v2_providers_updated_at ON v2_providers;
CREATE TRIGGER trigger_v2_providers_updated_at
  BEFORE UPDATE ON v2_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_v2_provider_policies_updated_at ON v2_provider_policies;
CREATE TRIGGER trigger_v2_provider_policies_updated_at
  BEFORE UPDATE ON v2_provider_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update session last_updated
CREATE OR REPLACE FUNCTION update_v2_session_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_v2_session_last_updated ON v2_user_sessions;
CREATE TRIGGER trigger_v2_session_last_updated
  BEFORE UPDATE ON v2_user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_v2_session_last_updated();

-- ============================================================================
-- CLEANUP FUNCTIONS - Maintenance
-- ============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_v2_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete expired sessions (cascades to analysis)
  DELETE FROM v2_user_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  RAISE NOTICE 'Cleaned up % expired V2 sessions', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired policy analysis
CREATE OR REPLACE FUNCTION cleanup_expired_v2_analysis()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM v2_policy_analysis WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % expired V2 analysis records', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Combined cleanup function
CREATE OR REPLACE FUNCTION cleanup_v2_database()
RETURNS JSONB AS $$
DECLARE
  sessions_cleaned INTEGER;
  analysis_cleaned INTEGER;
  result JSONB;
BEGIN
  -- Run cleanup procedures
  SELECT cleanup_expired_v2_sessions() INTO sessions_cleaned;
  SELECT cleanup_expired_v2_analysis() INTO analysis_cleaned;
  
  -- Return summary
  result := jsonb_build_object(
    'sessions_cleaned', sessions_cleaned,
    'analysis_cleaned', analysis_cleaned,
    'cleanup_time', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA - Initial Configuration
-- ============================================================================

-- Insert Australia configuration
INSERT INTO v2_country_configurations (country_code, country_name, configuration) VALUES (
  'AU',
  'Australia',
  '{
    "currency": "AUD",
    "timezone": "Australia/Sydney",
    "regulatory_framework": {
      "privacy_act": "Privacy Act 1988",
      "health_insurance": "Private Health Insurance Act 2007"
    },
    "policy_types": ["hospital", "extras", "combined"],
    "coverage_categories": ["general_treatment", "hospital_treatment"],
    "validation_rules": {
      "waiting_periods": {
        "hospital": "12 months",
        "extras": "2-12 months"
      }
    }
  }'
) ON CONFLICT (country_code) DO NOTHING;

-- Insert sample providers
INSERT INTO v2_providers (provider_name, provider_code, business_details, onboarding_status) VALUES 
('Health Cover Fund', 'HCF', '{"type": "health_insurer", "market": "AU"}', 'active'),
('Medibank Private', 'MEDIBANK', '{"type": "health_insurer", "market": "AU"}', 'active'),
('BUPA Australia', 'BUPA', '{"type": "health_insurer", "market": "AU"}', 'active')
ON CONFLICT (provider_code) DO NOTHING;

-- ============================================================================
-- VIEWS - Convenience Queries
-- ============================================================================

-- Active sessions view
CREATE OR REPLACE VIEW v2_active_sessions AS
SELECT 
  s.session_id,
  s.country_code,
  c.country_name,
  s.status,
  s.progress_percentage,
  s.current_stage,
  s.started_at,
  s.last_updated,
  s.expires_at
FROM v2_user_sessions s
JOIN v2_country_configurations c ON s.country_code = c.country_code
WHERE s.expires_at > NOW() AND c.is_active = true;

-- Provider policies summary
CREATE OR REPLACE VIEW v2_provider_policies_summary AS
SELECT 
  pp.id,
  p.provider_name,
  pp.provider_code,
  pp.policy_name,
  pp.policy_type,
  pp.country_code,
  pp.state,
  pp.is_active,
  pp.created_at,
  pp.updated_at
FROM v2_provider_policies pp
JOIN v2_providers p ON pp.provider_id = p.id
WHERE pp.is_active = true;

-- ============================================================================
-- PERMISSIONS - Security Setup
-- ============================================================================

-- Create application user role (adjust as needed)
-- CREATE ROLE poco_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO poco_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO poco_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO poco_app_user;

-- ============================================================================
-- SCHEMA VERSION - Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_versions (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_versions (version, description) VALUES 
('2.0.0', 'V2 unified schema - country-agnostic JSONB-based design')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 Poco.ai V2 Database Schema Successfully Created!';
  RAISE NOTICE '📊 Tables: v2_user_sessions, v2_policy_analysis, v2_country_configurations';
  RAISE NOTICE '📊 Tables: v2_providers, v2_provider_policies, v2_policy_state_history';
  RAISE NOTICE '🚀 Ready for V2DatabaseSessionStore and Provider Services';
  RAISE NOTICE '✅ Compatible with country-agnostic architecture';
END $$;