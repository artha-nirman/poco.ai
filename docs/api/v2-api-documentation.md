# Poco.ai V2 API Documentation

## Overview

The Poco.ai V2 API provides a country-agnostic, flexible system for insurance policy analysis and comparison. Built with a JSONB-based architecture, it supports multiple regulatory frameworks and can be easily extended to new countries.

### Key Features

- **Country-Agnostic Design**: Single API supporting multiple regulatory frameworks
- **Flexible Configuration**: JSON-based country configurations
- **Real-Time Progress**: Server-Sent Events for live analysis updates
- **PII Protection**: Advanced privacy controls with encryption and anonymization
- **Type Safety**: Comprehensive TypeScript interfaces

### Base URL

```
Production: https://poco.ai/api/v2
Development: http://localhost:3000/api/v2
```

### Authentication

Currently using session-based authentication. Future versions will support API keys.

---

## Endpoints

### 1. Policy Analysis

#### POST `/v2/{country}/policies/analyze`

Initiates policy analysis for a specific country.

**Path Parameters:**
- `country` (string, required): Country code (AU, SG, NZ)

**Request Headers:**
- `Content-Type: application/json`
- `User-Agent: YourApp/1.0`

**Request Body:**

```typescript
{
  policy_text: string;           // Raw policy document text
  user_preferences?: {
    max_premium?: number;        // Maximum acceptable premium
    preferred_providers?: string[]; // ['HCF', 'MEDIBANK']
    must_have_features?: string[]; // Required coverage features
    comparison_count?: number;   // Number of recommendations (default: 5)
  };
  analysis_options?: {
    include_cost_comparison?: boolean;
    include_feature_gap_analysis?: boolean;
    include_provider_recommendations?: boolean;
    priority_weights?: {
      cost: number;              // 0.0 - 1.0
      coverage: number;          // 0.0 - 1.0
      provider_reputation: number; // 0.0 - 1.0
      customer_service: number;  // 0.0 - 1.0
    };
  };
}
```

**Example Request:**

```javascript
const response = await fetch('/api/v2/au/policies/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    policy_text: "Hospital Insurance Policy\nProvider: HCF\nPremium: $250/month...",
    user_preferences: {
      max_premium: 300,
      preferred_providers: ['MEDIBANK', 'BUPA'],
      comparison_count: 3
    },
    analysis_options: {
      include_cost_comparison: true,
      include_feature_gap_analysis: true,
      priority_weights: {
        cost: 0.4,
        coverage: 0.4,
        provider_reputation: 0.1,
        customer_service: 0.1
      }
    }
  })
});
```

**Response (202 Accepted):**

```json
{
  "session_id": "sess_1234567890abcdef",
  "status": "processing",
  "message": "Analysis started successfully",
  "progress_url": "/api/v2/au/policies/progress/sess_1234567890abcdef",
  "results_url": "/api/v2/au/policies/results/sess_1234567890abcdef",
  "estimated_completion": "2025-11-22T10:03:00Z",
  "country_config": {
    "code": "AU",
    "name": "Australia",
    "currency": "AUD",
    "supported_providers": ["HCF", "MEDIBANK", "BUPA", "NIB"]
  }
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "error": {
    "code": "INVALID_POLICY_TEXT",
    "message": "Policy text is required and must be at least 100 characters",
    "suggestion": "Please provide the complete policy document text"
  },
  "timestamp": "2025-11-22T10:01:00Z",
  "country_code": "AU"
}

// 422 Unprocessable Entity
{
  "error": {
    "code": "UNSUPPORTED_COUNTRY",
    "message": "Country 'US' is not supported",
    "details": "Supported countries: AU, SG, NZ",
    "suggestion": "Use one of the supported country codes"
  },
  "timestamp": "2025-11-22T10:01:00Z"
}

// 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds",
    "details": "Limit: 10 requests per minute per IP"
  },
  "timestamp": "2025-11-22T10:01:00Z"
}
```

---

### 2. Progress Tracking

#### GET `/v2/{country}/policies/progress/{sessionId}`

Get real-time progress updates for an ongoing analysis.

**Path Parameters:**
- `country` (string, required): Country code (AU, SG, NZ)
- `sessionId` (string, required): Session ID from analysis request

**Response (200 OK):**

```json
{
  "session_id": "sess_1234567890abcdef",
  "stage": "ai_analysis",
  "progress": 45,
  "message": "Analyzing policy features with AI model",
  "stages": [
    {
      "name": "document_upload",
      "status": "completed",
      "started_at": "2025-11-22T10:01:00Z",
      "completed_at": "2025-11-22T10:01:05Z"
    },
    {
      "name": "pii_protection",
      "status": "completed",
      "started_at": "2025-11-22T10:01:05Z",
      "completed_at": "2025-11-22T10:01:15Z"
    },
    {
      "name": "ai_analysis",
      "status": "in_progress",
      "started_at": "2025-11-22T10:01:15Z"
    },
    {
      "name": "policy_comparison",
      "status": "pending"
    },
    {
      "name": "recommendation_ranking",
      "status": "pending"
    }
  ],
  "estimated_time_remaining": 75
}
```

**Error Responses:**

```json
// 404 Not Found
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session 'sess_invalid123' not found or expired",
    "suggestion": "Check the session ID or start a new analysis"
  },
  "timestamp": "2025-11-22T10:01:00Z",
  "country_code": "AU"
}
```

---

### 3. Results Retrieval

#### GET `/v2/{country}/policies/results/{sessionId}`

Retrieve completed analysis results.

**Path Parameters:**
- `country` (string, required): Country code (AU, SG, NZ)
- `sessionId` (string, required): Session ID from analysis request

**Query Parameters:**
- `include_raw_data` (boolean, optional): Include raw analysis data
- `format` (string, optional): Response format - `json` (default) or `pdf`

**Response (200 OK):**

```json
{
  "session_id": "sess_1234567890abcdef",
  "country_code": "AU",
  "analysis_metadata": {
    "analyzed_at": "2025-11-22T10:03:00Z",
    "confidence_score": 0.92,
    "processing_time_ms": 125000,
    "ai_model_used": "gemini-1.5-pro"
  },
  
  "user_policy": {
    "detected_type": "hospital",
    "detected_tier": "silver",
    "current_premium": {
      "amount": 250,
      "currency": "AUD",
      "frequency": "monthly",
      "family_type": "single"
    },
    "features": {
      "emergency": {
        "included": ["Emergency surgery", "Ambulance cover"],
        "excluded": ["Dental emergencies"],
        "limitations": ["24-hour wait for accidents"],
        "waiting_periods": {
          "emergency_surgery": "immediate",
          "ambulance": "immediate"
        }
      },
      "specialist": {
        "included": ["Cardiology", "Orthopedics"],
        "excluded": ["Cosmetic surgery"],
        "limitations": ["Requires referral"],
        "waiting_periods": {
          "cardiology": "6_months",
          "orthopedics": "12_months"
        }
      }
    },
    "excess_info": {
      "hospital_excess": 500,
      "co_payments": {
        "specialist_visit": 25
      }
    },
    "provider_info": {
      "current_provider": "HCF",
      "policy_name": "Basic Hospital Plus",
      "start_date": "2024-06-15",
      "renewal_date": "2025-06-15"
    }
  },
  
  "recommendations": [
    {
      "provider": {
        "code": "MEDIBANK",
        "name": "Medibank Private",
        "contact_info": {
          "phone": "132 331",
          "website": "https://www.medibank.com.au"
        }
      },
      "policy": {
        "name": "Silver Hospital Plus",
        "type": "hospital",
        "tier": "silver",
        "premium": {
          "amount": 235,
          "currency": "AUD",
          "frequency": "monthly",
          "family_type": "single"
        }
      },
      "comparison_scores": {
        "overall_score": 88,
        "cost_score": 92,
        "coverage_score": 85,
        "provider_score": 82,
        "feature_match_score": 90
      },
      "feature_comparison": {
        "emergency": {
          "current_coverage": ["Emergency surgery", "Ambulance cover"],
          "recommended_coverage": ["Emergency surgery", "Ambulance cover", "Emergency dental"],
          "improvements": ["Emergency dental coverage"],
          "gaps": []
        },
        "specialist": {
          "current_coverage": ["Cardiology", "Orthopedics"],
          "recommended_coverage": ["Cardiology", "Orthopedics", "Neurology"],
          "improvements": ["Neurology coverage"],
          "gaps": []
        }
      },
      "cost_analysis": {
        "premium_difference": {
          "amount": -15,
          "percentage": -6.0,
          "annual_savings": 180
        },
        "excess_comparison": {
          "current_excess": 500,
          "recommended_excess": 400,
          "excess_difference": -100
        },
        "total_cost_comparison": {
          "current_annual_cost": 3500,
          "recommended_annual_cost": 3220,
          "potential_savings": 280
        }
      },
      "switching_considerations": {
        "waiting_periods_impact": [
          "12-month waiting period for orthopedics will restart",
          "6-month waiting period for cardiology will restart"
        ],
        "pre_existing_conditions": [
          "Existing conditions will be reassessed"
        ],
        "current_benefits_to_lose": [
          "HCF member rewards program"
        ],
        "recommended_timing": "Consider switching at policy renewal to avoid overlap"
      }
    }
  ],
  
  "summary": {
    "best_overall_recommendation": 0,
    "potential_annual_savings": 280,
    "key_improvements": [
      "Save $180 annually on premiums",
      "Lower excess by $100",
      "Gain emergency dental coverage",
      "Add neurology specialist coverage"
    ],
    "important_considerations": [
      "Waiting periods will restart",
      "Pre-existing conditions reassessment required",
      "Loss of current member benefits"
    ],
    "next_steps": [
      "Contact Medibank for a detailed quote",
      "Review waiting period impacts",
      "Compare with 2-3 additional providers",
      "Time switch with current policy renewal"
    ]
  }
}
```

**Error Responses:**

```json
// 202 Accepted (Still Processing)
{
  "status": "processing",
  "session_id": "sess_1234567890abcdef",
  "message": "Analysis still in progress",
  "progress": 75,
  "estimated_completion": "2025-11-22T10:04:30Z",
  "progress_url": "/api/v2/au/policies/progress/sess_1234567890abcdef"
}

// 404 Not Found
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session 'sess_invalid123' not found or expired",
    "suggestion": "Check the session ID or start a new analysis"
  },
  "timestamp": "2025-11-22T10:01:00Z",
  "country_code": "AU"
}

// 410 Gone
{
  "error": {
    "code": "RESULTS_EXPIRED",
    "message": "Analysis results have expired and been purged",
    "details": "Results are available for 7 days after completion",
    "suggestion": "Please run a new analysis"
  },
  "timestamp": "2025-11-22T10:01:00Z",
  "country_code": "AU"
}
```

---

## Real-Time Updates with Server-Sent Events

For real-time progress updates, connect to the SSE endpoint:

```javascript
const eventSource = new EventSource(`/api/v2/au/policies/progress/${sessionId}/stream`);

eventSource.onmessage = function(event) {
  const progress = JSON.parse(event.data);
  console.log(`Progress: ${progress.progress}% - ${progress.message}`);
  
  if (progress.progress === 100) {
    eventSource.close();
    // Fetch final results
    window.location.href = `/api/v2/au/policies/results/${sessionId}`;
  }
};

eventSource.onerror = function(event) {
  console.error('SSE connection error:', event);
  eventSource.close();
};
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Suggested Action |
|------|-------------|-------------|------------------|
| `INVALID_POLICY_TEXT` | 400 | Policy text missing or too short | Provide complete policy document |
| `INVALID_COUNTRY_CODE` | 400 | Malformed country code | Use 2-letter ISO codes (AU, SG, NZ) |
| `UNSUPPORTED_COUNTRY` | 422 | Country not supported | Use supported countries only |
| `SESSION_NOT_FOUND` | 404 | Session expired or invalid | Start new analysis |
| `RESULTS_EXPIRED` | 410 | Results purged after 7 days | Run new analysis |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI analysis service down | Retry later |
| `PII_PROTECTION_ERROR` | 500 | Privacy processing failed | Contact support |

### Error Response Schema

```typescript
interface V2ErrorResponse {
  error: {
    code: string;                // Machine-readable error code
    message: string;             // Human-readable error message
    details?: string;            // Additional error context
    suggestion?: string;         // Recommended next action
  };
  session_id?: string;           // Session ID if available
  timestamp: string;             // ISO 8601 timestamp
  country_code?: string;         // Country code if applicable
}
```

---

## Rate Limiting

- **Analysis Requests**: 10 per hour per IP address
- **Progress Requests**: 60 per minute per session
- **Results Requests**: 30 per minute per session

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1732276800
```

---

## Data Privacy & Security

### PII Protection

The API automatically detects and protects Personally Identifiable Information (PII):

1. **Detection**: Automatically identifies policy numbers, member IDs, contact details
2. **Encryption**: PII encrypted with AES-256-GCM
3. **Anonymization**: Policy analysis uses anonymized data only
4. **Retention**: PII data purged after 24 hours
5. **Compliance**: Meets Australian Privacy Act 1988 requirements

### Data Retention

- **Analysis Results**: 7 days
- **PII Data**: 24 hours (auto-purged)
- **Session Data**: 7 days
- **Audit Logs**: 90 days

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PocoClient } from '@poco/sdk';

const client = new PocoClient({
  baseUrl: 'https://poco.ai/api/v2',
  country: 'AU'
});

const analysis = await client.analyzePolicy({
  policyText: document.policyText,
  preferences: {
    maxPremium: 300,
    preferredProviders: ['MEDIBANK', 'BUPA'],
    comparisonCount: 5
  }
});

// Real-time progress
analysis.onProgress((progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
});

// Get results
const results = await analysis.getResults();
console.log('Best recommendation:', results.recommendations[0]);
```

### Python

```python
from poco_sdk import PocoClient

client = PocoClient(
    base_url='https://poco.ai/api/v2',
    country='AU'
)

# Start analysis
session = client.analyze_policy(
    policy_text=policy_text,
    user_preferences={
        'max_premium': 300,
        'preferred_providers': ['MEDIBANK', 'BUPA']
    }
)

# Wait for completion with progress updates
def on_progress(progress):
    print(f"{progress['stage']}: {progress['progress']}%")

results = session.wait_for_results(on_progress=on_progress)
print(f"Best recommendation: {results['recommendations'][0]}")
```

---

## Webhook Notifications

Configure webhooks to receive notifications when analysis completes:

```javascript
// Configure webhook endpoint
await client.setWebhookUrl('https://your-app.com/webhooks/poco');

// Webhook payload
{
  "event": "analysis_completed",
  "session_id": "sess_1234567890abcdef",
  "country_code": "AU",
  "status": "completed",
  "results_url": "/api/v2/au/policies/results/sess_1234567890abcdef",
  "timestamp": "2025-11-22T10:03:00Z",
  "signature": "sha256=abc123..." // HMAC signature for verification
}
```

---

## Migration from V1

See [Migration Guide](./v1-to-v2-migration.md) for detailed migration instructions.

Key V2 improvements:
- Country-agnostic architecture
- Enhanced PII protection
- Real-time progress tracking
- Improved recommendation accuracy
- Flexible configuration system

---

## Support

- **Documentation**: https://docs.poco.ai/v2
- **API Status**: https://status.poco.ai
- **Support Email**: api-support@poco.ai
- **Community Forum**: https://community.poco.ai

---

*Last updated: November 22, 2025*