-- V2 Flexible Database Schema for Country-Agnostic Policy Storage
-- Supports multiple countries with JSONB for flexible policy structures

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS v2_policy_analysis CASCADE;
DROP TABLE IF EXISTS v2_user_sessions CASCADE; 
DROP TABLE IF EXISTS v2_policy_features CASCADE;
DROP TABLE IF EXISTS v2_country_configurations CASCADE;

-- Country configurations table
CREATE TABLE v2_country_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(3) NOT NULL UNIQUE, -- 'AU', 'SG', 'NZ'
    country_name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    configuration JSONB NOT NULL, -- Full country configuration
    version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_country_code (country_code),
    INDEX idx_configuration_gin (configuration USING gin)
);

-- V2 flexible user sessions with country awareness
CREATE TABLE v2_user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    country_code VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created', -- 'created', 'processing', 'completed', 'failed'
    
    -- Input data (flexible)
    policy_text TEXT,
    policy_type VARCHAR(50),
    provider_name VARCHAR(255),
    user_preferences JSONB,
    request_metadata JSONB,
    
    -- Processing state
    current_stage VARCHAR(100),
    progress_percentage INTEGER DEFAULT 0,
    stages JSONB, -- Array of processing stages with country context
    estimated_completion TIMESTAMP WITH TIME ZONE,
    
    -- Analysis results (flexible structure)
    analysis_results JSONB,
    
    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    error_details JSONB,
    
    -- Metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Performance tracking
    processing_time_ms INTEGER,
    api_version VARCHAR(20) DEFAULT '2.0',
    privacy_level VARCHAR(20) DEFAULT 'standard',
    
    CONSTRAINT fk_country_code 
        FOREIGN KEY (country_code) 
        REFERENCES v2_country_configurations(country_code)
        ON UPDATE CASCADE,
    
    -- Indexes for performance
    INDEX idx_session_id (session_id),
    INDEX idx_country_code (country_code),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_analysis_results_gin (analysis_results USING gin),
    INDEX idx_user_preferences_gin (user_preferences USING gin)
);

-- V2 flexible policy features storage
CREATE TABLE v2_policy_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    policy_type VARCHAR(50) NOT NULL,
    provider_name VARCHAR(255),
    
    -- Flexible feature structure
    base_features JSONB NOT NULL, -- Country-agnostic features
    country_features JSONB, -- Country-specific adaptations
    provider_features JSONB, -- Provider-specific features
    
    -- Analysis metadata
    confidence_score DECIMAL(5,2),
    compliance_score DECIMAL(5,2),
    risk_assessment JSONB,
    regulatory_compliance JSONB,
    
    -- Processing metadata
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_version VARCHAR(20),
    
    CONSTRAINT fk_session_id 
        FOREIGN KEY (session_id) 
        REFERENCES v2_user_sessions(session_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_policy_country_code 
        FOREIGN KEY (country_code) 
        REFERENCES v2_country_configurations(country_code),
    
    -- Indexes
    INDEX idx_policy_session_id (session_id),
    INDEX idx_policy_country_code (country_code),
    INDEX idx_policy_type (policy_type),
    INDEX idx_base_features_gin (base_features USING gin),
    INDEX idx_country_features_gin (country_features USING gin)
);

-- V2 policy analysis results with country context
CREATE TABLE v2_policy_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id VARCHAR(255) NOT NULL UNIQUE,
    session_id VARCHAR(255) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- Analysis components
    policy_analysis JSONB NOT NULL, -- Main policy analysis
    insights JSONB NOT NULL, -- Key insights and recommendations
    comparison_data JSONB, -- Market comparison data
    export_options JSONB, -- Export and sharing options
    
    -- Compliance and regulatory
    regulatory_compliance JSONB NOT NULL,
    risk_assessment JSONB NOT NULL,
    country_specific_notes JSONB,
    
    -- Performance metrics
    processing_stages JSONB, -- Detailed processing information
    performance_metrics JSONB, -- Timing, accuracy, etc.
    
    -- Metadata
    confidence_score DECIMAL(5,2) NOT NULL,
    api_version VARCHAR(20) DEFAULT '2.0',
    country_config_version VARCHAR(20),
    privacy_level VARCHAR(20) DEFAULT 'standard',
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    accessed_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_analysis_session_id 
        FOREIGN KEY (session_id) 
        REFERENCES v2_user_sessions(session_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_analysis_country_code 
        FOREIGN KEY (country_code) 
        REFERENCES v2_country_configurations(country_code),
    
    -- Indexes
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_analysis_session_id (session_id),
    INDEX idx_analysis_country_code (country_code),
    INDEX idx_expires_at (expires_at),
    INDEX idx_policy_analysis_gin (policy_analysis USING gin),
    INDEX idx_insights_gin (insights USING gin)
);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_country_configurations_timestamp
    BEFORE UPDATE ON v2_country_configurations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_sessions_timestamp
    BEFORE UPDATE ON v2_user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Views for easy querying
CREATE VIEW v2_active_sessions AS
SELECT 
    s.session_id,
    s.country_code,
    cc.country_name,
    s.status,
    s.progress_percentage,
    s.current_stage,
    s.started_at,
    s.last_updated,
    s.expires_at
FROM v2_user_sessions s
JOIN v2_country_configurations cc ON s.country_code = cc.country_code
WHERE s.expires_at > NOW() AND cc.is_active = true;

CREATE VIEW v2_analysis_summary AS
SELECT 
    a.analysis_id,
    a.session_id,
    a.country_code,
    cc.country_name,
    a.confidence_score,
    a.generated_at,
    a.expires_at,
    a.accessed_count,
    s.policy_type,
    s.provider_name
FROM v2_policy_analysis a
JOIN v2_country_configurations cc ON a.country_code = cc.country_code
JOIN v2_user_sessions s ON a.session_id = s.session_id
WHERE a.expires_at > NOW();

-- Sample country configurations (will be loaded separately)
INSERT INTO v2_country_configurations (country_code, country_name, currency, configuration, version) VALUES
('AU', 'Australia', 'AUD', '{}', '1.0'),
('SG', 'Singapore', 'SGD', '{}', '1.0'),
('NZ', 'New Zealand', 'NZD', '{}', '1.0');

-- Performance optimization settings
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Cleanup procedure for old sessions and analyses
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    sessions_deleted INTEGER := 0;
    analyses_deleted INTEGER := 0;
BEGIN
    -- Delete expired sessions
    DELETE FROM v2_user_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS sessions_deleted = ROW_COUNT;
    
    -- Delete expired analyses (cascades will handle related data)
    DELETE FROM v2_policy_analysis 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS analyses_deleted = ROW_COUNT;
    
    deleted_count := sessions_deleted + analyses_deleted;
    
    -- Log cleanup
    INSERT INTO cleanup_log (cleaned_at, sessions_deleted, analyses_deleted, total_deleted)
    VALUES (NOW(), sessions_deleted, analyses_deleted, deleted_count);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup log table
CREATE TABLE IF NOT EXISTS cleanup_log (
    id SERIAL PRIMARY KEY,
    cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sessions_deleted INTEGER,
    analyses_deleted INTEGER,
    total_deleted INTEGER
);

-- Schedule cleanup (requires pg_cron extension in production)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

COMMENT ON TABLE v2_country_configurations IS 'Country-specific configurations for policy analysis';
COMMENT ON TABLE v2_user_sessions IS 'User analysis sessions with country context and flexible data storage';
COMMENT ON TABLE v2_policy_features IS 'Extracted policy features with country-specific adaptations';
COMMENT ON TABLE v2_policy_analysis IS 'Complete policy analysis results with country compliance';

COMMENT ON COLUMN v2_user_sessions.analysis_results IS 'JSONB containing full V2AnalysisResponse structure';
COMMENT ON COLUMN v2_policy_features.base_features IS 'Country-agnostic policy features';
COMMENT ON COLUMN v2_policy_features.country_features IS 'Country-specific feature adaptations';
COMMENT ON COLUMN v2_policy_analysis.regulatory_compliance IS 'Country-specific compliance analysis';

-- Grant permissions (adjust for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;