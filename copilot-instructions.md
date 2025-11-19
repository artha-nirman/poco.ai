# Copilot Development Instructions

## Project Context
This is an AI system for Australian health insurance comparison. Before making any changes, consult these project-specific documents:

### 📋 **Core Documents**
- **Business Requirements**: `/docs/business/PRD-poco-mvp.md`
- **Technical Architecture**: `/docs/architecture/technical-architecture.md`
- **Service Interfaces**: `/docs/architecture/service-abstractions.md`
- **Database Schema**: `/docs/database/schemas.sql`
- **Security Design**: `/docs/security/pii-protection-architecture.md`

---

## Development Protocol

### **STEP 1: Document Consultation**
Before any implementation, review relevant project docs:
- **Requirements/Scope**: Check PRD first
- **Architecture/Stack**: Check technical-architecture.md
- **Database Changes**: Check schemas.sql + evolution-strategy.md
- **Security/PII**: Check pii-protection-architecture.md
- **Service Integration**: Check service-abstractions.md

### **STEP 2: Decision Approval**
For any architectural changes, new features, or significant technical decisions:
1. **Present Options**: Show 2-3 alternative approaches with pros/cons
2. **Impact Analysis**: Explain effects on performance, cost, complexity, timeline
3. **Wait for Approval**: Do not proceed without explicit user confirmation
4. **Confirm Understanding**: Repeat back the approved approach

**Requires Approval**: New dependencies, schema changes, pipeline modifications, API integrations, UX flow changes, cost-impacting decisions

### **STEP 3: Implementation Standards**

#### Code Organization
```
/lib/services/     - Service abstractions and implementations
/lib/types/        - TypeScript interfaces and types
/lib/utils/        - Utility functions and helpers
/lib/constants/    - All text, prompts, messages, config
/api/              - API endpoints
/components/       - React components
/docs/             - Project documentation
```

#### Code Quality Standards
- **TypeScript**: Strict typing with comprehensive interfaces
- **Error Handling**: Try-catch blocks with structured responses
- **Constants**: ALL text/prompts/config in `/lib/constants/` files
- **Comments**: Document decisions, business logic, and temporary solutions
- **Testing**: Unit tests for logic, integration tests for APIs, E2E for user journeys

#### Mock Data & Development
- **Mock Notifications**: Always notify user when implementing mock functionality
- **Clear Comments**: `// TODO: MOCK DATA - Replace with real implementation`
- **Service Markers**: `// MOCK SERVICE - [Description of real service]`
- **Temporary Code**: `// TEMPORARY: [Reason and replacement plan]`

### **STEP 4: File Management**
- **Think Before Creating**: Consider updating existing files vs creating new ones
- **Proper Structure**: Use established `/docs/` subdirectories
- **Avoid Redundancy**: Check for existing files covering similar topics
- **Update vs Create**: When invalidating previous decisions, update existing docs

---

## Performance Guidelines

### Serverless Constraints
- **Function Timeout**: <60 seconds per function
- **Memory Usage**: Optimize for cost efficiency
- **Cold Starts**: Design for acceptable startup times

### Caching Strategy
- **Session Data**: Use Vercel KV for temporary data
- **Processed Results**: Cache expensive computations
- **Provider Data**: Cache static policy information

### Cost Management
- **LLM Usage**: Monitor and optimize token usage
- **Database**: Efficient queries with proper indexing
- **Storage**: Appropriate retention policies

---

## Testing Strategy

### Test Coverage
- **Unit Tests**: Core business logic, utility functions
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Complete user journeys (upload → results)
- **Performance Tests**: Processing time, memory usage

### Test Organization
- **Test Files**: Co-located with source files
- **Mock Services**: Consistent mocking patterns
- **Test Data**: Realistic but anonymized datasets

---

## Deployment & Environment

### Environment Management
- **Configuration**: Separate configs for dev/staging/production
- **Service Switching**: Easy provider changes via environment variables
- **Secrets**: Secure handling of API keys and credentials

### Monitoring
- **Processing Metrics**: Time per stage, success/failure rates
- **Cost Tracking**: Per-operation costs for LLMs and processing
- **Error Monitoring**: Structured logging with context
- **User Analytics**: Journey completion, abandonment points

---

## Communication Protocol

### Status Updates
- **Progress**: Use structured status messages
- **Errors**: User-friendly error messages with recovery options
- **Decisions**: Document all architectural decisions made during development

### User Interaction
- **Clarification**: Ask for guidance when requirements are unclear
- **Options**: Present alternatives with clear trade-offs
- **Confirmation**: Confirm understanding before implementation

---

**Core Principle**: When in doubt, consult documentation first, then ask for guidance rather than making assumptions.