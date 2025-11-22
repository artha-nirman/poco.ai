-- V2 Database Schema - Flexible JSONB-based Design
-- Supports multiple countries and regulatory frameworks

-- ============================================================================
-- V2 User Sessions Table (Flexible JSONB Schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_user_sessions (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  
  -- Channel and processing info
  channel TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'created',
  
  -- Country-specific configuration
  country_code TEXT NOT NULL,
  country_configuration JSONB,
  
  -- Flexible data storage (JSONB for any regulatory framework)
  input_metadata JSONB,
  processing_state JSONB,
  analysis_results JSONB,
  recommendations JSONB,
  metadata JSONB,
  
  -- Privacy and compliance
  pii_data JSONB,
  encryption_key TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Performance tracking
  processing_time_ms INTEGER,
  
  -- Indexes for performance
  CONSTRAINT valid_status CHECK (status IN ('created', 'processing', 'completed', 'failed', 'expired')),
  CONSTRAINT valid_country CHECK (country_code IN ('AU', 'SG', 'NZ'))
);

-- ============================================================================
-- Indexes for V2 Sessions
-- ============================================================================

-- Primary lookup index
CREATE INDEX IF NOT EXISTS idx_v2_sessions_session_id ON v2_user_sessions(session_id);

-- Country and status filtering
CREATE INDEX IF NOT EXISTS idx_v2_sessions_country_status ON v2_user_sessions(country_code, status);

-- Expiration cleanup
CREATE INDEX IF NOT EXISTS idx_v2_sessions_expires_at ON v2_user_sessions(expires_at);

-- JSONB indexes for analysis results
CREATE INDEX IF NOT EXISTS idx_v2_sessions_analysis_results_gin ON v2_user_sessions USING GIN (analysis_results);

-- JSONB indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_v2_sessions_recommendations_gin ON v2_user_sessions USING GIN (recommendations);

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_v2_sessions_metadata_gin ON v2_user_sessions USING GIN (metadata);

-- ============================================================================
-- V2 Provider Policies (Country-Agnostic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_provider_policies (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL,
  policy_code TEXT NOT NULL,
  
  -- Country and type
  country_code TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  
  -- Basic policy info
  policy_name TEXT NOT NULL,
  policy_tier TEXT, -- 'basic', 'bronze', 'silver', 'gold'
  
  -- Pricing (flexible structure)
  pricing_info JSONB NOT NULL,
  
  -- Features (flexible JSONB structure)
  policy_features JSONB NOT NULL,
  
  -- Provider information
  provider_info JSONB,
  
  -- Coverage and benefits
  coverage_categories JSONB,
  exclusions JSONB,
  waiting_periods JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure unique policy per provider/country/code
  UNIQUE(provider_code, policy_code, country_code)
);

-- ============================================================================
-- Indexes for V2 Provider Policies
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_v2_policies_country_type ON v2_provider_policies(country_code, policy_type);
CREATE INDEX IF NOT EXISTS idx_v2_policies_provider_active ON v2_provider_policies(provider_code, is_active);

-- JSONB indexes for feature searches
CREATE INDEX IF NOT EXISTS idx_v2_policies_features_gin ON v2_provider_policies USING GIN (policy_features);
CREATE INDEX IF NOT EXISTS idx_v2_policies_pricing_gin ON v2_provider_policies USING GIN (pricing_info);

-- ============================================================================
-- V2 Country Configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_country_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT UNIQUE NOT NULL,
  
  -- Country information
  country_info JSONB NOT NULL,
  
  -- Regulatory framework
  regulatory_framework JSONB NOT NULL,
  
  -- Policy types for this country
  policy_types JSONB NOT NULL,
  
  -- Coverage categories specific to this country
  coverage_categories JSONB NOT NULL,
  
  -- Validation rules
  validation_rules JSONB,
  
  -- Provider list for this country
  providers JSONB,
  
  -- Configuration metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- V2 Session Progress Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_session_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES v2_user_sessions(session_id) ON DELETE CASCADE,
  
  -- Progress information
  current_stage TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  stage_details JSONB,
  
  -- Timing
  stage_started_at TIMESTAMPTZ DEFAULT NOW(),
  stage_completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  
  -- Messages and logs
  progress_message TEXT,
  stage_logs JSONB,
  
  UNIQUE(session_id, current_stage)
);

-- Index for progress lookups
CREATE INDEX IF NOT EXISTS idx_v2_progress_session_id ON v2_session_progress(session_id);

-- ============================================================================
-- V2 PII Protection Logs (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_pii_protection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  
  -- PII detection results
  pii_detected BOOLEAN DEFAULT false,
  pii_types JSONB, -- Array of detected PII types
  detection_confidence JSONB, -- Confidence scores
  
  -- Protection actions taken
  encryption_applied BOOLEAN DEFAULT false,
  anonymization_applied BOOLEAN DEFAULT false,
  redaction_applied BOOLEAN DEFAULT false,
  
  -- Audit information
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Compliance
  regulatory_framework TEXT,
  retention_policy JSONB
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_v2_pii_logs_session_id ON v2_pii_protection_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_v2_pii_logs_expires_at ON v2_pii_protection_logs(expires_at);

-- ============================================================================
-- V2 Analytics and Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS v2_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  
  -- Event information
  event_type TEXT NOT NULL,
  event_data JSONB,
  
  -- Context
  country_code TEXT,
  channel TEXT DEFAULT 'web',
  user_agent TEXT,
  
  -- Timing
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Performance metrics
  processing_time_ms INTEGER,
  success BOOLEAN
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_v2_analytics_type_timestamp ON v2_analytics_events(event_type, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_v2_analytics_country_timestamp ON v2_analytics_events(country_code, event_timestamp);

-- ============================================================================
-- Legacy Table Compatibility (V1 -> V2 Migration Support)
-- ============================================================================

-- Create view for backward compatibility
CREATE OR REPLACE VIEW user_sessions AS
SELECT 
  id,
  session_id,
  channel,
  status,
  input_metadata->>'policy_text' as policy_text,
  analysis_results,
  recommendations,
  metadata,
  created_at,
  completed_at,
  processing_time_ms,
  expires_at
FROM v2_user_sessions;

-- ============================================================================
-- Data Cleanup Functions
-- ============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_v2_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM v2_user_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired PII logs
CREATE OR REPLACE FUNCTION cleanup_expired_pii_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM v2_pii_protection_logs WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers for Automatic Updates
-- ============================================================================

-- Update timestamp trigger for v2_user_sessions
CREATE OR REPLACE FUNCTION update_v2_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_v2_session_timestamp
  BEFORE UPDATE ON v2_user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_v2_session_timestamp();

-- Update timestamp trigger for v2_provider_policies
CREATE OR REPLACE FUNCTION update_v2_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_v2_policy_timestamp
  BEFORE UPDATE ON v2_provider_policies
  FOR EACH ROW EXECUTE FUNCTION update_v2_policy_timestamp();

-- ============================================================================
-- Sample Data for Testing (Optional)
-- ============================================================================

-- Insert sample country configuration for Australia
INSERT INTO v2_country_configurations (country_code, country_info, regulatory_framework, policy_types, coverage_categories, providers) VALUES
('AU', 
 '{"code": "AU", "name": "Australia", "currency": "AUD", "timezone": "Australia/Sydney"}',
 '{"name": "Australian Privacy Act 1988", "data_retention_days": 7, "pii_protection_required": true}',
 '[
   {"id": "hospital", "name": "Hospital Cover", "description": "Covers hospital treatments and procedures"},
   {"id": "extras", "name": "Extras Cover", "description": "Covers dental, optical, physio and other extras"},
   {"id": "combined", "name": "Combined Cover", "description": "Hospital and extras combined"}
 ]',
 '[
   {"id": "emergency", "name": "Emergency Services", "required": true},
   {"id": "dental", "name": "Dental", "required": false},
   {"id": "optical", "name": "Optical", "required": false}
 ]',
 '[
   {"code": "MEDIBANK", "name": "Medibank", "tier": "tier1"},
   {"code": "BUPA", "name": "BUPA", "tier": "tier1"},
   {"code": "HCF", "name": "HCF", "tier": "tier2"}
 ]'
)
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================================
-- Grants and Permissions
-- ============================================================================

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- Schema Version Info
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_versions (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_versions (version, description) VALUES 
('2.0.0', 'V2 flexible JSONB-based schema supporting multiple countries')
ON CONFLICT (version) DO NOTHING;