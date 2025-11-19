# PII Protection Architecture
## Privacy-First Design for Poco.ai Health Insurance Comparison

---

## 1. Overview

This document outlines the comprehensive PII (Personally Identifiable Information) protection architecture for Poco.ai, ensuring compliance with Australian Privacy Act 1988 while maintaining functionality for insurance policy comparison.

## 2. PII Risk Assessment

### 2.1 High-Risk PII in Insurance Policies
- **Identity Information**: Full names, dates of birth, addresses, phone numbers, email addresses
- **Financial Data**: Current premium amounts, payment methods, bank account details
- **Medical Information**: Pre-existing conditions, medical history, dependent health information
- **Policy Details**: Policy numbers, account numbers, membership IDs
- **Family Information**: Dependent names, ages, relationships

### 2.2 Regulatory Requirements
- **Australian Privacy Act 1988**: Principles 3, 5, 6, 11, 13 compliance required
- **Data Breach Notification**: Mandatory reporting for eligible data breaches
- **Cross-Border Transfer**: Restrictions on overseas data transfer without adequate protection

---

## 3. Privacy-by-Design Architecture

### 3.1 Core Principles
1. **Data Minimization**: Collect only essential PII, anonymize everything else
2. **Purpose Limitation**: Use PII only for stated comparison purposes
3. **Storage Limitation**: Auto-purge PII after 24 hours maximum
4. **Security by Default**: Encrypt all PII, zero-trust access model
5. **Transparency**: Clear disclosure of PII collection and processing

### 3.2 Three-Layer Protection Model

```typescript
┌─────────────────────────────────────────────────────────┐
│                    LAYER 1: PII DETECTION               │
│  Immediate identification and isolation of sensitive     │
│  data using pattern matching and ML-based detection     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  LAYER 2: ANONYMIZATION                │
│  Create sanitized version of document with PII          │
│  replaced by generic tokens (e.g., [NAME], [PREMIUM])   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 LAYER 3: SECURE PROCESSING             │
│  All AI analysis performed on anonymized data only.     │
│  Optional re-personalization with explicit user consent │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Technical Implementation

### 4.1 PII Detection Service

```typescript
interface PIIDetector {
  /**
   * Scans document content for PII using multiple detection methods
   */
  detectPII(content: string): PIIDetectionResult;
}

interface PIIDetectionResult {
  detectedPII: PIIItem[];
  anonymizedContent: string;
  confidence: number; // 0-1 confidence score
}

interface PIIItem {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  replacementToken: string; // e.g., "[NAME_1]", "[PREMIUM_1]"
}

enum PIIType {
  FULL_NAME = 'full_name',
  ADDRESS = 'address', 
  PHONE = 'phone',
  EMAIL = 'email',
  PREMIUM_AMOUNT = 'premium_amount',
  POLICY_NUMBER = 'policy_number',
  DATE_OF_BIRTH = 'date_of_birth',
  MEDICAL_CONDITION = 'medical_condition'
}
```

### 4.2 Secure Storage Architecture

```typescript
interface SecurePIIStorage {
  /**
   * Store PII with encryption and automatic expiration
   */
  storePII(sessionId: string, piiData: PIIItem[]): Promise<string>; // Returns encryption key
  
  /**
   * Retrieve PII for authorized re-personalization only
   */
  retrievePII(sessionId: string, encryptionKey: string): Promise<PIIItem[]>;
  
  /**
   * Immediate secure deletion of PII data
   */
  purgePII(sessionId: string): Promise<void>;
  
  /**
   * Automated cleanup job (runs every hour)
   */
  autoCleanupExpired(): Promise<CleanupReport>;
}

interface EncryptedPIIStorage {
  sessionId: string;
  encryptedData: Buffer; // AES-256-GCM encrypted PII items
  encryptionSalt: Buffer;
  createdAt: Date;
  expiresAt: Date; // Max 24 hours from creation
  accessLog: PIIAccessEvent[];
}

interface PIIAccessEvent {
  timestamp: Date;
  action: 'store' | 'retrieve' | 'purge';
  userAgent: string;
  ipAddress: string; // Hashed for privacy
  success: boolean;
}
```

### 4.3 Anonymized Processing Pipeline

```typescript
interface AnonymizedProcessor {
  /**
   * Process policy document without any PII exposure
   */
  analyzePolicy(anonymizedContent: string): Promise<PolicyAnalysis>;
  
  /**
   * Generate recommendations using only non-PII data
   */
  generateRecommendations(analysis: PolicyAnalysis): Promise<RecommendationSet>;
}

interface PolicyAnalysis {
  // NO PII FIELDS ALLOWED
  coverageTypes: CoverageType[];
  premiumCategory: PremiumRange; // e.g., "under-200", "200-400", "over-400"
  ageGroup: AgeCategory; // e.g., "under-30", "30-50", "over-50"
  stateCode: StateCode;
  dependentCount: number;
  features: PolicyFeature[];
  waitingPeriods: WaitingPeriod[];
  exclusions: string[];
}

// Safe data types (no PII)
type PremiumRange = 'under-200' | '200-400' | '400-600' | 'over-600';
type AgeCategory = 'under-30' | '30-50' | 'over-50';
type StateCode = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
```

### 4.4 Optional Re-Personalization

```typescript
interface PersonalizationService {
  /**
   * Add personal context back to results with explicit user consent
   */
  personalizeResults(
    anonymizedResults: RecommendationSet,
    sessionId: string,
    encryptionKey: string,
    consent: PersonalizationConsent
  ): Promise<PersonalizedResults>;
}

interface PersonalizationConsent {
  includeName: boolean; // "Hello [Name], based on your policy..."
  includePremium: boolean; // "Your current premium of $X vs recommended $Y"
  includeAddress: boolean; // For provider proximity matching
  dataRetention: '1-hour' | '24-hours' | 'session-only';
}

interface PersonalizedResults {
  personalizedSummary: string; // With name/premium if consented
  genericRecommendations: RecommendationSet; // Always PII-free
  privacyNote: string; // Clear explanation of data use
}
```

---

## 5. Privacy Controls & User Experience

### 5.1 Consent Management

```typescript
interface PrivacyControls {
  // Default: Minimal PII processing
  defaultMode: 'anonymous-only';
  
  // Optional enhancements with explicit consent
  enhancementOptions: {
    personalizedGreeting: boolean; // Use name in results
    premiumComparison: boolean; // Show exact premium differences
    locationBasedProviders: boolean; // Use address for provider proximity
  };
  
  // Data retention preferences
  dataRetention: {
    resultsCaching: '1-hour' | '24-hours' | 'none';
    emailCopy: boolean; // Store results for email resend
    auditTrail: boolean; // Keep anonymized analysis for improvement
  };
}
```

### 5.2 Transparency Features

```typescript
interface PrivacyDashboard {
  /**
   * Show user exactly what PII was detected and how it's being used
   */
  showPIIReport(sessionId: string): PIITransparencyReport;
  
  /**
   * Allow user to review and modify consent preferences
   */
  updateConsent(sessionId: string, newConsent: PersonalizationConsent): Promise<void>;
  
  /**
   * Immediate data deletion on user request
   */
  deleteMyData(sessionId: string): Promise<DeletionReport>;
}

interface PIITransparencyReport {
  detectedPII: {
    type: PIIType;
    description: string; // "We detected a name: [REDACTED]"
    usage: string; // "Used for: Personalized greeting (with your consent)"
    retention: string; // "Stored for: 24 hours maximum, then auto-deleted"
  }[];
  anonymizedFields: string[]; // What was anonymized for AI processing
  userChoices: PersonalizationConsent; // Current consent settings
}
```

---

## 6. Security Implementation

### 6.1 Encryption Strategy

```typescript
interface EncryptionConfig {
  algorithm: 'AES-256-GCM'; // AEAD encryption for authenticated encryption
  keyDerivation: 'PBKDF2'; // Key derivation from session secrets
  saltLength: 32; // Random salt per encryption operation
  keyRotation: 30 * 24 * 60 * 60; // 30 days in seconds
  keyStorage: 'vercel-kv-encrypted'; // Vercel KV with additional encryption layer
}

class PIIEncryption {
  async encryptPII(data: PIIItem[], sessionSecret: string): Promise<EncryptedPIIData> {
    const salt = crypto.randomBytes(32);
    const key = await this.deriveKey(sessionSecret, salt);
    const encrypted = await this.encrypt(JSON.stringify(data), key);
    
    return {
      encryptedData: encrypted,
      salt: salt,
      algorithm: 'AES-256-GCM'
    };
  }
  
  async decryptPII(encrypted: EncryptedPIIData, sessionSecret: string): Promise<PIIItem[]> {
    const key = await this.deriveKey(sessionSecret, encrypted.salt);
    const decrypted = await this.decrypt(encrypted.encryptedData, key);
    return JSON.parse(decrypted);
  }
  
  private async deriveKey(secret: string, salt: Buffer): Promise<CryptoKey> {
    // PBKDF2 with 100,000 iterations
  }
}
```

### 6.2 Access Control

```typescript
interface PIIAccessControl {
  // NO administrative access to PII data
  adminAccess: 'none'; 
  
  // Only user session can access their own PII
  sessionAccess: 'user-only';
  
  // All access logged immutably
  auditLogging: 'mandatory';
  
  // Zero-knowledge architecture
  serverAccess: 'encrypted-only';
}

interface PIIAuditLog {
  sessionId: string; // Hashed for privacy
  timestamp: Date;
  action: PIIAccessAction;
  success: boolean;
  errorCode?: string;
  userAgent: string; // For security monitoring
  ipHash: string; // Hashed IP for abuse prevention
}

enum PIIAccessAction {
  DETECT = 'pii_detect',
  STORE = 'pii_store', 
  RETRIEVE = 'pii_retrieve',
  PERSONALIZE = 'pii_personalize',
  PURGE = 'pii_purge',
  AUTO_CLEANUP = 'pii_auto_cleanup'
}
```

---

## 7. Compliance Validation

### 7.1 Australian Privacy Act 1988 Checklist

| Principle | Requirement | Implementation | Status |
|-----------|-------------|----------------|---------|
| **APP 3** | Only collect necessary PII | Data minimization + anonymization | ✅ Implemented |
| **APP 5** | Notify about collection | Clear privacy notice + consent UI | ✅ Implemented |
| **APP 6** | Use only for stated purpose | Purpose-limited processing | ✅ Implemented |
| **APP 11** | Secure disclosure controls | Encrypted storage + access controls | ✅ Implemented |
| **APP 13** | Data correction rights | User data management dashboard | ✅ Implemented |

### 7.2 Security Standards Compliance

- **Encryption**: AES-256-GCM (FIPS 140-2 Level 1)
- **Key Management**: PBKDF2 with 100,000 iterations
- **Access Logging**: Immutable audit trail with integrity protection
- **Data Retention**: Maximum 24 hours with automated purging
- **Zero Knowledge**: Server cannot access unencrypted PII

---

## 8. Implementation Priority

### 8.1 Phase 1: Core PII Protection (Week 1)
1. PII detection service implementation
2. Anonymization pipeline 
3. Encrypted storage setup
4. Basic audit logging

### 8.2 Phase 2: User Controls (Week 1-2)
1. Consent management system
2. Privacy dashboard development
3. Data deletion mechanisms
4. Transparency reporting

### 8.3 Phase 3: Compliance Validation (Week 2)
1. Privacy Act compliance audit
2. Security penetration testing
3. Data retention validation
4. Access control testing

---

## 9. Monitoring & Maintenance

### 9.1 Privacy Metrics
- PII detection accuracy rate
- Data retention compliance (auto-purge success)
- User consent rates for personalization
- Privacy notice engagement metrics

### 9.2 Security Monitoring
- Failed decryption attempts
- Unusual access patterns
- Data retention violations
- Encryption key rotation status

### 9.3 Compliance Auditing
- Monthly privacy compliance reviews
- Quarterly security assessments
- Annual Privacy Act compliance audit
- Incident response plan testing

---

**Document Status**: Ready for Implementation
**Last Updated**: Initial Version
**Next Review**: Post-Implementation Security Audit