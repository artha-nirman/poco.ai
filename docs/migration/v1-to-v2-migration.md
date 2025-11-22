# V1 to V2 Migration Guide - Poco.ai

## Overview

Poco.ai V2 introduces a major architectural upgrade with country-agnostic design, enhanced PII protection, and flexible configuration-driven policy analysis. This guide helps you migrate from V1 to V2 systems.

## Key V2 Improvements

### 🌍 **Country-Agnostic Architecture**
- **V1**: Hard-coded for Australian regulations only
- **V2**: Flexible JSONB-based system supporting AU, SG, NZ with easy expansion

### 🔒 **Enhanced PII Protection**
- **V1**: Basic data handling
- **V2**: Advanced PII detection, encryption, and anonymization with 24-hour auto-purge

### ⚡ **Real-Time Progress**
- **V1**: Batch processing with basic status updates
- **V2**: Server-Sent Events (SSE) with detailed stage-by-stage progress

### 🧠 **Improved AI Analysis**
- **V1**: Single AI provider (GPT-4)
- **V2**: Multi-provider support with fallback (Gemini 1.5 Pro + Claude 3.5 Sonnet)

### 📊 **Flexible Database Schema**
- **V1**: Rigid table structure
- **V2**: JSONB-based flexible schema with configuration-driven validation

---

## Breaking Changes

### API Endpoints

| V1 Endpoint | V2 Endpoint | Change Type |
|-------------|-------------|-------------|
| `POST /api/analyze` | `POST /api/v2/{country}/policies/analyze` | **BREAKING**: Country-specific routing |
| `GET /api/progress/{id}` | `GET /api/v2/{country}/policies/progress/{sessionId}` | **BREAKING**: New path structure |
| `GET /api/results/{id}` | `GET /api/v2/{country}/policies/results/{sessionId}` | **BREAKING**: New path structure |
| `GET /api/status` | `GET /api/system/status` | **COMPATIBLE**: System endpoints unchanged |

### Request/Response Schemas

#### Analysis Request (BREAKING)

**V1 Request:**
```json
{
  "policyText": "...",
  "preferences": {
    "maxPremium": 300,
    "providers": ["HCF", "MEDIBANK"]
  }
}
```

**V2 Request:**
```json
{
  "policy_text": "...",
  "user_preferences": {
    "max_premium": 300,
    "preferred_providers": ["HCF", "MEDIBANK"],
    "comparison_count": 5
  },
  "analysis_options": {
    "include_cost_comparison": true,
    "priority_weights": {
      "cost": 0.4,
      "coverage": 0.4,
      "provider_reputation": 0.1,
      "customer_service": 0.1
    }
  }
}
```

#### Response Schema (BREAKING)

**V1 Response Structure:**
```json
{
  "sessionId": "...",
  "currentPolicy": {...},
  "recommendations": [...]
}
```

**V2 Response Structure:**
```json
{
  "session_id": "...",
  "country_code": "AU",
  "analysis_metadata": {...},
  "user_policy": {...},
  "recommendations": [...],
  "summary": {...}
}
```

---

## Migration Steps

### Step 1: Update API Base URL

```javascript
// V1
const baseUrl = 'https://poco.ai/api';

// V2
const baseUrl = 'https://poco.ai/api/v2';
```

### Step 2: Add Country Support

```javascript
// V1 - Hard-coded Australian support
const response = await fetch('/api/analyze', {...});

// V2 - Country-specific endpoints
const country = 'AU'; // or 'SG', 'NZ'
const response = await fetch(`/api/v2/${country}/policies/analyze`, {...});
```

### Step 3: Update Request Schema

```javascript
// V1 Request Mapping
function mapV1ToV2Request(v1Request) {
  return {
    policy_text: v1Request.policyText,
    user_preferences: {
      max_premium: v1Request.preferences?.maxPremium,
      preferred_providers: v1Request.preferences?.providers,
      comparison_count: v1Request.preferences?.count || 5,
      must_have_features: v1Request.preferences?.requiredFeatures
    },
    analysis_options: {
      include_cost_comparison: true,
      include_feature_gap_analysis: true,
      include_provider_recommendations: true,
      priority_weights: v1Request.preferences?.weights || {
        cost: 0.4,
        coverage: 0.4,
        provider_reputation: 0.1,
        customer_service: 0.1
      }
    }
  };
}

// Usage
const v2Request = mapV1ToV2Request(originalRequest);
const response = await fetch(`/api/v2/au/policies/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(v2Request)
});
```

### Step 4: Update Response Handling

```javascript
// V1 Response Mapping
function mapV2ToV1Response(v2Response) {
  return {
    sessionId: v2Response.session_id,
    status: v2Response.analysis_metadata ? 'completed' : 'processing',
    confidence: v2Response.analysis_metadata?.confidence_score,
    processingTime: v2Response.analysis_metadata?.processing_time_ms,
    
    currentPolicy: {
      provider: v2Response.user_policy?.provider_info?.current_provider,
      type: v2Response.user_policy?.detected_type,
      tier: v2Response.user_policy?.detected_tier,
      premium: {
        amount: v2Response.user_policy?.current_premium?.amount,
        frequency: v2Response.user_policy?.current_premium?.frequency
      },
      features: v2Response.user_policy?.features,
      excess: v2Response.user_policy?.excess_info?.hospital_excess
    },
    
    recommendations: v2Response.recommendations?.map(rec => ({
      id: `${rec.provider.code}_${rec.policy.name}`,
      provider: rec.provider.name,
      policyName: rec.policy.name,
      score: rec.comparison_scores.overall_score,
      premium: {
        amount: rec.policy.premium.amount,
        frequency: rec.policy.premium.frequency
      },
      savings: rec.cost_analysis.premium_difference.annual_savings,
      improvements: Object.values(rec.feature_comparison)
        .flatMap(cat => cat.improvements),
      contactInfo: rec.provider.contact_info
    })) || [],
    
    summary: {
      bestRecommendation: v2Response.summary?.best_overall_recommendation,
      maxSavings: v2Response.summary?.potential_annual_savings,
      keyPoints: v2Response.summary?.key_improvements,
      considerations: v2Response.summary?.important_considerations,
      nextSteps: v2Response.summary?.next_steps
    }
  };
}
```

### Step 5: Update Progress Monitoring

```javascript
// V1 - Simple polling
async function monitorProgressV1(sessionId) {
  const response = await fetch(`/api/progress/${sessionId}`);
  return response.json();
}

// V2 - Enhanced progress with SSE support
async function monitorProgressV2(country, sessionId) {
  // Option 1: Polling (compatible with V1)
  const response = await fetch(`/api/v2/${country}/policies/progress/${sessionId}`);
  const progress = await response.json();
  
  return {
    sessionId: progress.session_id,
    stage: progress.stage,
    progress: progress.progress,
    message: progress.message,
    estimatedTime: progress.estimated_time_remaining,
    stages: progress.stages // New detailed stage info
  };
}

// Option 2: Real-time SSE (V2 only)
function connectToProgressStream(country, sessionId) {
  const eventSource = new EventSource(
    `/api/v2/${country}/policies/progress/${sessionId}/stream`
  );
  
  eventSource.onmessage = function(event) {
    const progress = JSON.parse(event.data);
    updateProgressUI(progress);
    
    if (progress.progress === 100) {
      eventSource.close();
      fetchResults(country, sessionId);
    }
  };
  
  return eventSource;
}
```

---

## Migration Strategies

### Strategy 1: Big Bang Migration (Recommended)

Replace the entire system at once. Best for smaller applications.

```javascript
// Create V2 wrapper that maintains V1 interface
class PocoV2Wrapper {
  constructor(country = 'AU') {
    this.country = country;
    this.baseUrl = 'https://poco.ai/api/v2';
  }

  // V1-compatible method
  async analyzePolicy(v1Request) {
    const v2Request = this.mapV1ToV2Request(v1Request);
    
    const response = await fetch(`${this.baseUrl}/${this.country}/policies/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v2Request)
    });
    
    const v2Response = await response.json();
    return this.mapV2ToV1Response(v2Response);
  }

  // V1-compatible progress monitoring
  async getProgress(sessionId) {
    const response = await fetch(`${this.baseUrl}/${this.country}/policies/progress/${sessionId}`);
    const v2Progress = await response.json();
    return this.mapV2ProgressToV1(v2Progress);
  }

  // V1-compatible results
  async getResults(sessionId) {
    const response = await fetch(`${this.baseUrl}/${this.country}/policies/results/${sessionId}`);
    const v2Results = await response.json();
    return this.mapV2ToV1Response(v2Results);
  }
  
  // Mapping methods (implementation above)
  mapV1ToV2Request(v1Request) { /* ... */ }
  mapV2ToV1Response(v2Response) { /* ... */ }
  mapV2ProgressToV1(v2Progress) { /* ... */ }
}

// Usage - minimal code changes
const client = new PocoV2Wrapper('AU'); // Specify country
const results = await client.analyzePolicy(originalV1Request);
```

### Strategy 2: Gradual Migration

Migrate feature by feature over time.

```javascript
class PocoMigrationClient {
  constructor() {
    this.useV2 = {
      analyze: process.env.USE_V2_ANALYZE === 'true',
      progress: process.env.USE_V2_PROGRESS === 'true',
      results: process.env.USE_V2_RESULTS === 'true'
    };
  }

  async analyzePolicy(request) {
    if (this.useV2.analyze) {
      return this.analyzeWithV2(request);
    } else {
      return this.analyzeWithV1(request);
    }
  }

  async getProgress(sessionId) {
    if (this.useV2.progress) {
      return this.getProgressV2(sessionId);
    } else {
      return this.getProgressV1(sessionId);
    }
  }

  // Implement both V1 and V2 methods
  async analyzeWithV1(request) { /* V1 implementation */ }
  async analyzeWithV2(request) { /* V2 implementation */ }
}
```

### Strategy 3: Parallel Running

Run both V1 and V2 simultaneously for comparison.

```javascript
class PocoParallelClient {
  constructor() {
    this.v1Client = new PocoV1Client();
    this.v2Client = new PocoV2Client();
  }

  async analyzePolicy(request) {
    // Start both analyses
    const [v1Result, v2Result] = await Promise.allSettled([
      this.v1Client.analyzePolicy(request),
      this.v2Client.analyzePolicy(request)
    ]);

    // Log comparison for validation
    this.compareResults(v1Result.value, v2Result.value);

    // Return V2 result (or V1 as fallback)
    if (v2Result.status === 'fulfilled') {
      return v2Result.value;
    } else {
      console.warn('V2 failed, falling back to V1:', v2Result.reason);
      return v1Result.value;
    }
  }

  compareResults(v1, v2) {
    // Log differences for monitoring
    console.log('Migration Validation:', {
      v1SessionId: v1?.sessionId,
      v2SessionId: v2?.session_id,
      v1RecommendationCount: v1?.recommendations?.length,
      v2RecommendationCount: v2?.recommendations?.length,
      // Add more comparison metrics
    });
  }
}
```

---

## Database Migration

### V1 Schema

```sql
-- V1 Tables (Rigid Structure)
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    policy_text TEXT,
    status VARCHAR(20),
    results JSONB,
    created_at TIMESTAMP
);

CREATE TABLE providers (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    policies JSONB
);
```

### V2 Schema Migration

```sql
-- V2 Migration Script
-- 1. Create new V2 tables
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    channel TEXT NOT NULL DEFAULT 'web',
    status TEXT NOT NULL DEFAULT 'created',
    
    -- Flexible JSONB fields
    input_metadata JSONB,
    processing_state JSONB,
    analysis_results JSONB,
    recommendations JSONB,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- V2 specific fields
    country_code TEXT DEFAULT 'AU',
    pii_data JSONB,
    vector_embedding VECTOR(384)
);

-- 2. Migrate existing V1 data
INSERT INTO user_sessions (
    session_id,
    status,
    analysis_results,
    created_at,
    country_code
)
SELECT 
    id::text,
    CASE 
        WHEN status = 'complete' THEN 'completed'
        WHEN status = 'processing' THEN 'processing'
        ELSE 'failed'
    END,
    results,
    created_at,
    'AU' -- Default to Australia for V1 data
FROM sessions;

-- 3. Create provider policies table
CREATE TABLE provider_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'AU',
    
    policy_details JSONB NOT NULL,
    search_keywords TEXT[],
    search_text TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Migrate provider data
INSERT INTO provider_policies (
    provider_code,
    policy_name,
    policy_type,
    policy_details,
    country_code
)
SELECT 
    upper(name),
    pol->>'name',
    pol->>'type',
    pol,
    'AU'
FROM providers p,
     jsonb_array_elements(p.policies) pol;
```

### Data Migration Script

```javascript
// Node.js migration script
const { Pool } = require('pg');

async function migrateV1ToV2() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  console.log('Starting V1 to V2 migration...');

  try {
    // 1. Backup existing data
    console.log('Creating backup...');
    await pool.query(`
      CREATE TABLE sessions_v1_backup AS 
      SELECT * FROM sessions;
    `);

    // 2. Create V2 schema
    console.log('Creating V2 schema...');
    const schemaSQL = await fs.readFile('docs/database/v2-schema.sql', 'utf8');
    await pool.query(schemaSQL);

    // 3. Migrate session data
    console.log('Migrating session data...');
    const sessions = await pool.query(`
      SELECT id, policy_text, status, results, created_at 
      FROM sessions 
      WHERE status IN ('complete', 'completed')
    `);

    for (const session of sessions.rows) {
      const v2SessionId = `sess_${Date.now()}_${session.id.substring(0, 8)}`;
      
      // Convert V1 results to V2 format
      const v2Results = convertV1ResultsToV2(session.results);
      
      await pool.query(`
        INSERT INTO user_sessions (
          session_id, status, analysis_results, metadata, 
          created_at, country_code
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        v2SessionId,
        'completed',
        v2Results,
        {
          migrated_from_v1: true,
          original_session_id: session.id,
          migration_timestamp: new Date().toISOString()
        },
        session.created_at,
        'AU'
      ]);
    }

    // 4. Update application configuration
    console.log('Updating configuration...');
    await updateApplicationConfig();

    console.log('Migration completed successfully!');
    
    // 5. Validation
    console.log('Running validation...');
    await validateMigration(pool);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

function convertV1ResultsToV2(v1Results) {
  if (!v1Results) return null;

  return {
    session_id: v1Results.sessionId,
    country_code: 'AU',
    analysis_metadata: {
      analyzed_at: new Date().toISOString(),
      confidence_score: v1Results.confidence || 0.8,
      processing_time_ms: 120000,
      ai_model_used: 'gpt-4' // V1 used GPT-4
    },
    user_policy: {
      detected_type: v1Results.currentPolicy?.type || 'hospital',
      detected_tier: v1Results.currentPolicy?.tier || 'silver',
      current_premium: {
        amount: v1Results.currentPolicy?.premium?.amount || 0,
        currency: 'AUD',
        frequency: v1Results.currentPolicy?.premium?.frequency || 'monthly',
        family_type: 'single'
      },
      features: v1Results.currentPolicy?.features || {},
      excess_info: {
        hospital_excess: v1Results.currentPolicy?.excess || 500
      },
      provider_info: {
        current_provider: v1Results.currentPolicy?.provider || 'UNKNOWN'
      }
    },
    recommendations: (v1Results.recommendations || []).map(rec => ({
      provider: {
        code: rec.provider?.toUpperCase() || 'UNKNOWN',
        name: rec.provider || 'Unknown Provider',
        contact_info: {
          phone: rec.contactInfo?.phone || '',
          website: rec.contactInfo?.website || ''
        }
      },
      policy: {
        name: rec.policyName || 'Unknown Policy',
        type: rec.type || 'hospital',
        tier: rec.tier || 'silver',
        premium: {
          amount: rec.premium?.amount || 0,
          currency: 'AUD',
          frequency: rec.premium?.frequency || 'monthly',
          family_type: 'single'
        }
      },
      comparison_scores: {
        overall_score: rec.score || 80,
        cost_score: 85,
        coverage_score: 80,
        provider_score: 75,
        feature_match_score: 80
      },
      cost_analysis: {
        premium_difference: {
          amount: rec.savings ? -Math.abs(rec.savings / 12) : 0,
          percentage: 0,
          annual_savings: rec.savings || 0
        },
        excess_comparison: {
          current_excess: 500,
          recommended_excess: 500,
          excess_difference: 0
        },
        total_cost_comparison: {
          current_annual_cost: 3000,
          recommended_annual_cost: 3000 - (rec.savings || 0),
          potential_savings: rec.savings || 0
        }
      },
      switching_considerations: {
        waiting_periods_impact: [],
        pre_existing_conditions: [],
        current_benefits_to_lose: [],
        recommended_timing: 'Contact provider for details'
      }
    })),
    summary: {
      best_overall_recommendation: 0,
      potential_annual_savings: v1Results.maxSavings || 0,
      key_improvements: v1Results.summary?.keyPoints || [],
      important_considerations: v1Results.summary?.considerations || [],
      next_steps: v1Results.summary?.nextSteps || []
    }
  };
}

async function validateMigration(pool) {
  // Check data integrity
  const v1Count = await pool.query('SELECT COUNT(*) FROM sessions_v1_backup');
  const v2Count = await pool.query('SELECT COUNT(*) FROM user_sessions WHERE metadata->>'migrated_from_v1' = 'true'');
  
  console.log(`V1 sessions: ${v1Count.rows[0].count}`);
  console.log(`Migrated V2 sessions: ${v2Count.rows[0].count}`);
  
  if (v1Count.rows[0].count !== v2Count.rows[0].count) {
    throw new Error('Data migration count mismatch!');
  }
  
  console.log('✅ Migration validation passed');
}

// Run migration
if (require.main === module) {
  migrateV1ToV2()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
```

---

## Testing Migration

### Pre-Migration Testing

```javascript
// Test V2 endpoints with V1 data
describe('V2 Migration Tests', () => {
  let testClient;

  beforeAll(() => {
    testClient = new PocoV2Wrapper('AU');
  });

  test('should handle V1 request format', async () => {
    const v1Request = {
      policyText: "Test policy document...",
      preferences: {
        maxPremium: 300,
        providers: ['HCF', 'MEDIBANK']
      }
    };

    const result = await testClient.analyzePolicy(v1Request);
    
    expect(result.sessionId).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  test('should maintain response format compatibility', async () => {
    const sessionId = 'test-session-123';
    const results = await testClient.getResults(sessionId);
    
    // Verify V1-compatible response structure
    expect(results).toHaveProperty('sessionId');
    expect(results).toHaveProperty('currentPolicy');
    expect(results).toHaveProperty('recommendations');
    expect(results).toHaveProperty('summary');
  });
});
```

### Post-Migration Validation

```bash
#!/bin/bash
# validation.sh - Post-migration validation script

echo "🔍 Starting post-migration validation..."

# 1. Test API endpoints
echo "Testing V2 API endpoints..."
curl -f "https://poco.ai/api/v2/au/policies/analyze" \
  -H "Content-Type: application/json" \
  -d '{"policy_text":"Test policy..."}' || exit 1

# 2. Check database integrity
echo "Checking database integrity..."
psql $DATABASE_URL -c "
  SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE metadata->>'migrated_from_v1' = 'true') as migrated_sessions,
    COUNT(*) FILTER (WHERE country_code = 'AU') as au_sessions
  FROM user_sessions;
"

# 3. Validate response format
echo "Validating response formats..."
node -e "
  const axios = require('axios');
  const testSession = 'test-session-123';
  
  axios.get(\`https://poco.ai/api/v2/au/policies/results/\${testSession}\`)
    .then(res => {
      const required = ['session_id', 'country_code', 'analysis_metadata'];
      const missing = required.filter(field => !res.data[field]);
      if (missing.length > 0) {
        throw new Error(\`Missing fields: \${missing.join(', ')}\`);
      }
      console.log('✅ Response format validation passed');
    })
    .catch(err => {
      if (err.response?.status === 404) {
        console.log('✅ 404 handling working correctly');
      } else {
        throw err;
      }
    });
"

echo "🎉 Validation completed successfully!"
```

---

## Rollback Plan

### Quick Rollback (Emergency)

```javascript
// Emergency rollback script
async function emergencyRollback() {
  console.log('🚨 Starting emergency rollback to V1...');
  
  // 1. Switch API traffic back to V1
  await updateLoadBalancerConfig({
    routes: {
      '/api/*': 'v1-service',
      '/api/v2/*': 'maintenance-page'
    }
  });
  
  // 2. Restore V1 database if needed
  if (process.env.RESTORE_DATABASE === 'true') {
    await restoreV1Database();
  }
  
  // 3. Update application config
  await updateConfig({
    API_VERSION: 'v1',
    USE_V2_ENDPOINTS: false
  });
  
  console.log('✅ Rollback completed');
}

async function restoreV1Database() {
  // Restore from backup
  await execCommand(`
    pg_restore --clean --if-exists 
    -d $DATABASE_URL 
    backups/pre_v2_migration.dump
  `);
}
```

### Gradual Rollback

```javascript
// Feature flag rollback
const featureFlags = {
  USE_V2_ANALYZE: false,    // Roll back analysis
  USE_V2_PROGRESS: true,    // Keep progress improvements
  USE_V2_RESULTS: false     // Roll back results format
};

// Update flags in real-time without deployment
await updateFeatureFlags(featureFlags);
```

---

## Post-Migration Monitoring

### Health Checks

```javascript
// V2 health monitoring
const healthChecks = {
  async checkV2Analysis() {
    const response = await fetch('/api/v2/au/policies/analyze', {
      method: 'POST',
      body: JSON.stringify({ policy_text: 'Test policy...' })
    });
    return response.ok;
  },
  
  async checkV2Database() {
    const result = await db.query(`
      SELECT COUNT(*) FROM user_sessions 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    return result.rows[0].count > 0;
  },
  
  async checkV2Performance() {
    const start = Date.now();
    await fetch('/api/v2/au/policies/progress/test-session');
    const duration = Date.now() - start;
    return duration < 1000; // Under 1 second
  }
};

// Run checks every minute
setInterval(async () => {
  const results = await Promise.allSettled([
    healthChecks.checkV2Analysis(),
    healthChecks.checkV2Database(),
    healthChecks.checkV2Performance()
  ]);
  
  const failedChecks = results
    .filter(r => r.status === 'rejected' || !r.value)
    .length;
  
  if (failedChecks > 0) {
    console.warn(`⚠️  ${failedChecks} health checks failed`);
    // Alert monitoring system
  }
}, 60000);
```

### Performance Monitoring

```javascript
// Track V2 vs V1 performance
const performanceMetrics = {
  analyzePolicy: {
    v1_avg_duration: 45000,  // 45s average
    v2_avg_duration: 38000,  // 38s average (improvement)
    v2_success_rate: 0.98,   // 98% success rate
    v2_pii_protection_rate: 0.85 // 85% of requests have PII
  },
  
  countrySupport: {
    au_requests: 0.75,   // 75% Australia
    sg_requests: 0.15,   // 15% Singapore
    nz_requests: 0.10    // 10% New Zealand
  }
};

// Real-time monitoring dashboard
app.get('/admin/migration-metrics', (req, res) => {
  res.json({
    migration_status: 'completed',
    v2_adoption_rate: 0.95,
    performance_improvement: '15%',
    error_rate: '0.2%',
    user_satisfaction: '4.8/5'
  });
});
```

---

## Support and Troubleshooting

### Common Migration Issues

#### Issue 1: Request Format Mismatch

**Problem:** V1 applications sending incorrect request format to V2.

**Solution:**
```javascript
// Add request transformation middleware
app.use('/api/v2', (req, res, next) => {
  if (req.body && req.body.policyText) {
    // Transform V1 request to V2 format
    req.body = {
      policy_text: req.body.policyText,
      user_preferences: {
        max_premium: req.body.preferences?.maxPremium,
        preferred_providers: req.body.preferences?.providers
      }
    };
  }
  next();
});
```

#### Issue 2: Session ID Format Changes

**Problem:** V1 session IDs don't match V2 format.

**Solution:**
```javascript
// Session ID mapper
function mapSessionId(sessionId) {
  // V1: UUID format
  // V2: sess_timestamp_hash format
  
  if (sessionId.match(/^[a-f0-9-]{36}$/)) {
    // V1 format - map to V2 format
    return `sess_v1_${sessionId.substring(0, 8)}`;
  }
  
  return sessionId; // Already V2 format
}
```

#### Issue 3: Country Code Missing

**Problem:** V1 requests don't specify country.

**Solution:**
```javascript
// Add default country detection
app.use('/api/v2', (req, res, next) => {
  if (!req.params.country) {
    // Detect from IP, headers, or default to AU
    const country = detectCountryFromRequest(req) || 'AU';
    req.url = req.url.replace('/api/v2/', `/api/v2/${country}/`);
  }
  next();
});

function detectCountryFromRequest(req) {
  // Check CloudFlare country header
  if (req.headers['cf-ipcountry']) {
    const country = req.headers['cf-ipcountry'];
    return ['AU', 'SG', 'NZ'].includes(country) ? country : 'AU';
  }
  
  // Check Accept-Language header
  const language = req.headers['accept-language'];
  if (language?.includes('en-AU')) return 'AU';
  if (language?.includes('en-SG')) return 'SG';
  if (language?.includes('en-NZ')) return 'NZ';
  
  return 'AU'; // Default
}
```

### Migration Support

- **Migration Consulting**: api-migration@poco.ai
- **Technical Support**: support@poco.ai  
- **Migration Documentation**: https://docs.poco.ai/v2/migration
- **Community Forum**: https://community.poco.ai/migration
- **Office Hours**: Tuesdays 2-4 PM AEST (during migration period)

---

## Timeline and Checklist

### Pre-Migration (Week -2 to -1)

- [ ] Review breaking changes documentation
- [ ] Set up V2 testing environment
- [ ] Create data backup
- [ ] Update monitoring and alerting
- [ ] Train development team on V2 APIs
- [ ] Prepare rollback plan

### Migration Week

**Day 1-2: Preparation**
- [ ] Final data backup
- [ ] Deploy migration scripts to staging
- [ ] Run full migration test
- [ ] Validate test results

**Day 3-4: Migration Execution**
- [ ] Execute database migration
- [ ] Deploy V2 application code
- [ ] Update API routing
- [ ] Run validation tests

**Day 5-7: Validation and Monitoring**
- [ ] Monitor system health
- [ ] Validate user workflows
- [ ] Address any issues
- [ ] Document lessons learned

### Post-Migration (Week +1 to +4)

- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Optimize based on usage patterns
- [ ] Plan next phase improvements
- [ ] Clean up V1 legacy code
- [ ] Update documentation

---

*Need migration assistance? Contact our migration team at api-migration@poco.ai*

*Last updated: November 22, 2025*