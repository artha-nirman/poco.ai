/**
 * Application Configuration Constants
 * Centralized configuration management
 */

export const PROCESSING_CONFIG = {
  // File Upload Constraints
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  SUPPORTED_FILE_TYPES: ['application/pdf'],
  SUPPORTED_EXTENSIONS: ['.pdf'],
  
  // Processing Timeouts
  MAX_PROCESSING_TIME_MS: 180000, // 3 minutes
  DOCUMENT_EXTRACTION_TIMEOUT_MS: 30000, // 30 seconds
  AI_ANALYSIS_TIMEOUT_MS: 90000, // 90 seconds
  COMPARISON_TIMEOUT_MS: 60000, // 60 seconds
  
  // Progress and Status
  SSE_POLL_INTERVAL_MS: 2000, // 2 seconds
  PROGRESS_UPDATE_INTERVAL_MS: 3000, // 3 seconds
  SESSION_HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  
  // Results Configuration
  DEFAULT_TOP_N_RESULTS: 5,
  MAX_TOP_N_RESULTS: 10,
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  MAX_COMPARISON_POLICIES: 30,
  
  // Retry Configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  EXPONENTIAL_BACKOFF_MULTIPLIER: 2
} as const;

export const SESSION_CONFIG = {
  // Session Lifecycle
  DEFAULT_SESSION_DURATION_HOURS: 24,
  MAX_SESSION_DURATION_HOURS: 168, // 7 days
  SESSION_CLEANUP_INTERVAL_HOURS: 1,
  
  // Session Identifiers
  SESSION_ID_LENGTH: 32,
  SESSION_PREFIX: 'poco_session_',
  
  // Channel Configuration
  SUPPORTED_CHANNELS: ['web', 'email'] as const,
  DEFAULT_CHANNEL: 'web',
  
  // Progress Tracking
  PROGRESS_STAGES: [
    'document_upload',
    'pii_detection', 
    'document_extraction',
    'ai_analysis',
    'policy_comparison',
    'recommendation_ranking',
    'results_generation',
    'completed'
  ] as const
} as const;

export const PRIVACY_CONFIG = {
  // PII Protection
  PII_RETENTION_HOURS: 24, // Maximum 24 hours per Australian Privacy Act
  AUTO_PURGE_INTERVAL_HOURS: 1,
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  ENCRYPTION_KEY_LENGTH: 32, // 256 bits
  ENCRYPTION_SALT_LENGTH: 16,
  
  // Data Minimization
  ANONYMIZATION_ENABLED: true,
  PII_DETECTION_CONFIDENCE_THRESHOLD: 0.8,
  ANONYMIZATION_VALIDATION_REQUIRED: true,
  
  // User Consent Options
  CONSENT_RETENTION_OPTIONS: ['session-only', '1-hour', '24-hours'] as const,
  DEFAULT_CONSENT_RETENTION: 'session-only',
  
  // Audit Requirements
  AUDIT_LOGGING_ENABLED: true,
  AUDIT_LOG_RETENTION_DAYS: 30,
  PII_ACCESS_LOGGING_REQUIRED: true
} as const;

export const PROVIDER_CONFIG = {
  // Document Processing Providers
  DOCUMENT_PROVIDERS: ['google', 'azure'] as const,
  DEFAULT_DOCUMENT_PROVIDER: 'google',
  
  // LLM Providers
  LLM_PROVIDERS: ['gemini', 'claude', 'openai'] as const,
  DEFAULT_LLM_PROVIDER: 'gemini',
  
  // Storage Providers
  STORAGE_PROVIDERS: ['vercel-blob', 'local'] as const,
  DEFAULT_STORAGE_PROVIDER: 'vercel-blob',
  
  // Email Providers
  EMAIL_PROVIDERS: ['resend', 'mock'] as const,
  DEFAULT_EMAIL_PROVIDER: 'resend',
  
  // Cache Providers
  CACHE_PROVIDERS: ['vercel-kv', 'memory'] as const,
  DEFAULT_CACHE_PROVIDER: 'vercel-kv',
  
  // Service Timeouts
  PROVIDER_TIMEOUT_MS: 30000,
  PROVIDER_RETRY_ATTEMPTS: 2,
  PROVIDER_HEALTH_CHECK_INTERVAL_MS: 60000
} as const;

export const API_CONFIG = {
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10,
  RATE_LIMIT_BURST_ALLOWANCE: 5,
  
  // API Versioning
  CURRENT_API_VERSION: 'v1',
  SUPPORTED_API_VERSIONS: ['v1'] as const,
  
  // Request/Response Limits
  MAX_REQUEST_SIZE_MB: 12, // Slightly larger than max file size
  MAX_RESPONSE_SIZE_MB: 50,
  REQUEST_TIMEOUT_MS: 30000,
  
  // CORS Configuration
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'https://poco.ai',
    'https://*.poco.ai'
  ],
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] as const,
  ALLOWED_HEADERS: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ] as const
} as const;

export const EMAIL_CONFIG = {
  // Email Templates
  DEFAULT_FROM_ADDRESS: 'analysis@poco.ai',
  DEFAULT_FROM_NAME: 'Poco.ai Insurance Analysis',
  DEFAULT_REPLY_TO: 'support@poco.ai',
  
  // Email Delivery
  MAX_EMAIL_SIZE_MB: 25,
  EMAIL_RETRY_ATTEMPTS: 3,
  EMAIL_RETRY_DELAY_MS: 5000,
  
  // Email Content
  MAX_SUBJECT_LENGTH: 150,
  MAX_PREVIEW_TEXT_LENGTH: 200,
  INCLUDE_PDF_ATTACHMENT: true,
  INCLUDE_WEB_LINK: true,
  
  // Email Tracking
  TRACK_EMAIL_OPENS: false, // Privacy-first approach
  TRACK_EMAIL_CLICKS: false,
  EMAIL_ANALYTICS_ENABLED: false
} as const;

export const DATABASE_CONFIG = {
  // Connection Configuration
  CONNECTION_POOL_SIZE: 10,
  CONNECTION_TIMEOUT_MS: 5000,
  QUERY_TIMEOUT_MS: 30000,
  
  // Data Retention
  SESSION_DATA_RETENTION_DAYS: 30,
  ANONYMIZED_RESULTS_RETENTION_DAYS: 30,
  AUDIT_LOG_RETENTION_DAYS: 90,
  
  // Performance
  ENABLE_QUERY_LOGGING: false, // Only in development
  ENABLE_QUERY_CACHE: true,
  CACHE_TTL_SECONDS: 3600, // 1 hour
  
  // Migration Configuration
  AUTO_MIGRATE: false, // Manual migration in production
  BACKUP_BEFORE_MIGRATION: true,
  MIGRATION_LOCK_TIMEOUT_MS: 300000 // 5 minutes
} as const;

export const MONITORING_CONFIG = {
  // Performance Monitoring
  ENABLE_PERFORMANCE_MONITORING: true,
  PERFORMANCE_SAMPLE_RATE: 0.1, // 10% sampling
  SLOW_QUERY_THRESHOLD_MS: 1000,
  
  // Error Monitoring
  ENABLE_ERROR_MONITORING: true,
  ERROR_REPORTING_ENABLED: true,
  CAPTURE_USER_FEEDBACK: true,
  
  // Metrics Collection
  COLLECT_USAGE_METRICS: true,
  COLLECT_PERFORMANCE_METRICS: true,
  COLLECT_COST_METRICS: true,
  METRICS_RETENTION_DAYS: 90,
  
  // Health Checks
  HEALTH_CHECK_INTERVAL_MS: 30000,
  SERVICE_HEALTH_TIMEOUT_MS: 5000,
  CRITICAL_SERVICES: ['database', 'document-ai', 'llm-provider'] as const
} as const;

export const FEATURE_FLAGS = {
  // Core Features
  ENABLE_PII_PROTECTION: true,
  ENABLE_EMAIL_CHANNEL: true,
  ENABLE_REAL_TIME_PROGRESS: true,
  ENABLE_PDF_GENERATION: true,
  
  // Advanced Features
  ENABLE_SEMANTIC_SEARCH: false, // Not yet implemented
  ENABLE_CHAT_INTERFACE: false, // Post-MVP feature
  ENABLE_PRICE_TRACKING: false, // Future feature
  ENABLE_RENEWAL_REMINDERS: false, // Future feature
  
  // Privacy Features
  ENABLE_CONSENT_MANAGEMENT: true,
  ENABLE_DATA_EXPORT: true,
  ENABLE_RIGHT_TO_DELETION: true,
  
  // Experimental Features
  ENABLE_A_B_TESTING: false,
  ENABLE_BETA_FEATURES: false,
  ENABLE_DEBUG_MODE: false
} as const;

// Environment-specific overrides
export const ENVIRONMENT_OVERRIDES = {
  development: {
    ENABLE_QUERY_LOGGING: true,
    ENABLE_DEBUG_MODE: true,
    RATE_LIMIT_MAX_REQUESTS: 100, // More lenient for development
    PII_RETENTION_HOURS: 1, // Shorter retention for testing
    AUTO_MIGRATE: true
  },
  
  test: {
    ENABLE_PERFORMANCE_MONITORING: false,
    ENABLE_ERROR_MONITORING: false,
    EMAIL_ANALYTICS_ENABLED: false,
    COLLECT_USAGE_METRICS: false,
    RATE_LIMIT_MAX_REQUESTS: 1000 // No rate limiting in tests
  },
  
  production: {
    ENABLE_DEBUG_MODE: false,
    ENABLE_QUERY_LOGGING: false,
    AUTO_MIGRATE: false,
    BACKUP_BEFORE_MIGRATION: true,
    ERROR_REPORTING_ENABLED: true
  }
} as const;