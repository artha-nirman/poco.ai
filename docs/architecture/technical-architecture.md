# Technical Architecture - Poco.ai

## Technology Stack

### Platform & Infrastructure
- **Frontend & Backend**: Next.js 14 + TypeScript (App Router) on Vercel Pro
- **Database**: Supabase PostgreSQL (via Vercel marketplace integration)
- **Storage**: Vercel Blob (PDFs), Vercel KV (caching/sessions)
- **AI Stack**: Google Document AI + Gemini 1.5 Pro (primary), Azure Document Intelligence + Claude 3.5 Sonnet (fallback)
- **Email**: Resend for notifications and email channel processing

### Service Architecture Patterns

#### Multi-Provider Strategy
- **Abstraction Layer**: All services swappable via interfaces (see `service-abstractions.md`)
- **Configuration-Driven**: Environment-based provider selection
- **Fallback Support**: Automatic failover between providers
- **Primary Stack**: Google Cloud Document AI + Gemini 1.5 Pro
- **Alternative Stack**: Azure Document Intelligence + Claude 3.5 Sonnet

#### Processing Architecture
- **Processing Pattern**: Server-Sent Events (SSE) for real-time progress updates
- **Function Constraints**: <60s serverless functions, chunked processing
- **Document Processing**: Document AI services (NOT PDF-to-images), preserve structure + LLM analysis
- **Dual Channel**: Web interface + email processing with shared business logic

## Data Architecture

### Database Design
- **Primary Database**: PostgreSQL with pgvector extension for embeddings
- **Schema**: Flexible JSONB structure for country-agnostic policies
- **Evolution**: Configuration-driven changes, no breaking schema migrations
- **User Sessions**: Temporary storage with auto-cleanup, status tracking via KV store

### V2 Flexible Policy Architecture
- **Country-Agnostic Core**: Configuration-driven policy structure supporting multiple regulatory frameworks
- **Dynamic Features**: Flexible coverage categories loaded from country configurations
- **Type Safety**: Compile-time PII protection through inheritance markers
- **Global Scalability**: Add new countries through JSON configuration files
- **BasePolicyFeatures**: Universal interface with country-specific extensions
- **ProviderPolicyFeatures**: Always PII-free with compile-time guarantee (`_piiStatus: 'NO_PII'`)
- **UserPolicyFeatures**: PII-aware processing with state tracking (`CONTAINS_PII | ANONYMIZED | ENCRYPTED`)
- **AnonymizedUserPolicyFeatures**: Safe for AI processing, extends UserPolicyFeatures
- **Country Configurations**: JSON-based regulatory framework definitions

### Security & Compliance
- **PII Protection**: Three-layer model (detection → isolation → encryption)
- **Encryption**: AES-256-GCM for sensitive data
- **Data Retention**: Auto-purge after 24 hours with audit logging
- **Compliance**: Australian Privacy Act 1988
- **Implementation**: See `/docs/security/pii-protection-architecture.md`

## Business Logic Architecture

### Processing Flow
- **Total Time**: 2-3 minutes with real-time SSE progress updates
- **Dual Channel**: Web upload + email processing with unified backend
- **Status Tracking**: Session-based progress via KV store
- **Error Handling**: Graceful fallbacks with user-friendly messaging
- **Type Safety**: Compile-time PII protection through strict interface inheritance

### Type-Safe Processing Pipeline
```typescript
// Stage 1: Upload (UserPolicyDocument with potential PII)
uploadUserPolicy(file: Buffer): Promise<UserPolicyDocument>

// Stage 2: PII Detection & Encryption
extractAndEncryptPII(doc: UserPolicyDocument): Promise<EncryptedUserPolicyFeatures>

// Stage 3: Safe Anonymization for AI
anonymizeForAI(encrypted: EncryptedUserPolicyFeatures): Promise<AnonymizedUserPolicyFeatures>

// Stage 4: Comparison (PII-free zone)
compareWithProviders(
  anonymized: AnonymizedUserPolicyFeatures,
  providers: ProviderPolicyFeatures[]
): Promise<ComparisonResult[]>
```

### Comparison Engine
- **Strategy**: Multi-policy analysis (compare against ALL provider policies, not 1:1)
- **Configuration**: User-configurable top-N results (3, 5, 8, etc.)
- **Scoring**: Feature-level analysis with conditions, exceptions, riders
- **Ranking**: Composite scoring with user preference weighting
- **Type Safety**: Only AnonymizedUserPolicyFeatures can be compared against ProviderPolicyFeatures
- **Compile-time Protection**: TypeScript prevents PII-containing data from reaching AI services

### Data Models
- **PolicyFeature**: Core coverage item with conditions, exceptions, riders
- **ComparisonResult**: Detailed feature-by-feature analysis with scoring
- **ScoringMetrics**: Multiple weighted scores (match rate, cost, conditions, etc.)
- **UserPreferences**: Top-N configuration, priority weights, filters

## Performance & Scalability

### Performance Requirements
- **Function Timeout**: Each serverless function <60 seconds
- **Database**: Efficient queries with appropriate indexing
- **Caching**: Processed results, provider data, embeddings via Vercel KV
- **Cost Management**: Monitor LLM usage, optimize for budget efficiency

### Deployment Strategy
- **Environment Management**: Separate configs for dev/staging/production
- **Service Configuration**: Easy provider switching via environment variables
- **Monitoring**: Track processing times, error rates, costs per operation
- **Scalability**: Designed for growth in policy database and user volume

## API Design Patterns

### Endpoint Structure
- **SSE Endpoints**: `/api/policies/stream/{sessionId}` for real-time updates
- **Processing Chain**: Multiple short API calls (<60s each)
- **Status Management**: Consistent session status updates via KV store
- **Error Responses**: Structured error responses with recovery options

### Integration Patterns
- **Service Abstractions**: All external services behind interfaces
- **Configuration**: Environment-based provider selection
- **Fallbacks**: Automatic failover between service providers
- **Monitoring**: Comprehensive logging and error tracking

---

## Related Documents
- **Service Interfaces**: `/docs/architecture/service-abstractions.md`
- **Database Schema**: `/docs/database/schemas.sql`
- **Database Strategy**: `/docs/database/architecture-strategy.md`
- **Security Architecture**: `/docs/security/pii-protection-architecture.md`
- **Platform Analysis**: `/docs/architecture/vercel-platform-analysis.md`
- **Business Requirements**: `/docs/business/PRD-poco-mvp.md`