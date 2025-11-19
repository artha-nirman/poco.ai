/**
 * PII Protection Service
 * Orchestrates PII detection, anonymization, and secure processing
 * Implements three-layer protection model from security architecture
 */

import { PIIDetector, PIIDetectionService, PIIItem, PIIType, PIIDetectionResult } from './pii-detector';
import { SecurePIIStorage, piiStorage, PIIAccessAction } from './pii-storage';

export interface AnonymizedDocument {
  sessionId: string;
  anonymizedContent: string;
  piiDetected: boolean;
  detectionConfidence: number;
  encryptionKey?: string; // Only if PII was detected and stored
}

export interface PersonalizationConsent {
  includeName: boolean;
  includePremium: boolean;
  includeAddress: boolean;
  dataRetention: '1-hour' | '24-hours' | 'session-only';
}

export interface PersonalizationRequest {
  sessionId: string;
  encryptionKey: string;
  consent: PersonalizationConsent;
  anonymizedText: string;
}

export interface PersonalizedResult {
  personalizedText: string;
  privacyNote: string;
  dataUsage: string[];
}

export interface PIITransparencyReport {
  sessionId: string;
  detectedPII: {
    type: PIIType;
    description: string;
    usage: string;
    retention: string;
  }[];
  anonymizedFields: string[];
  userChoices: PersonalizationConsent;
}

/**
 * Main PII Protection Service implementing three-layer protection model
 */
export class PIIProtectionService {
  private detector: PIIDetector;
  private storage: SecurePIIStorage;

  constructor() {
    this.detector = new PIIDetectionService();
    this.storage = piiStorage;
  }

  /**
   * LAYER 1: PII Detection and Isolation
   * Immediately identify and isolate sensitive data
   */
  async detectAndIsolatePII(content: string, sessionId: string): Promise<AnonymizedDocument> {
    try {
      // Detect PII using pattern matching
      const detectionResult = await this.detector.detectPII(content);

      // If no PII detected, return anonymized document without encryption
      if (detectionResult.detectedPII.length === 0) {
        return {
          sessionId,
          anonymizedContent: content,
          piiDetected: false,
          detectionConfidence: 1.0
        };
      }

      // Generate session secret for encryption
      const sessionSecret = this.generateSessionSecret();

      // Store encrypted PII data
      const encryptionKey = await this.storage.storePII(
        sessionId, 
        detectionResult.detectedPII, 
        sessionSecret
      );

      // Return anonymized document with encryption key
      return {
        sessionId,
        anonymizedContent: detectionResult.anonymizedContent,
        piiDetected: true,
        detectionConfidence: detectionResult.confidence,
        encryptionKey
      };

    } catch (error) {
      console.error('PII detection and isolation failed:', error);
      throw new Error('Failed to process document for PII protection');
    }
  }

  /**
   * LAYER 2: Anonymization Validation
   * Ensure anonymized content is safe for AI processing
   */
  async validateAnonymization(anonymizedContent: string): Promise<boolean> {
    try {
      // Re-run detection on anonymized content to catch any leaks
      const validation = await this.detector.detectPII(anonymizedContent);
      
      // Should detect no PII in anonymized content
      const hasLeakedPII = validation.detectedPII.length > 0;
      
      if (hasLeakedPII) {
        console.warn('PII leak detected in anonymized content:', validation.detectedPII);
      }

      return !hasLeakedPII;
    } catch (error) {
      console.error('Anonymization validation failed:', error);
      return false;
    }
  }

  /**
   * LAYER 3: Secure Processing
   * Process anonymized content safely for AI analysis
   */
  async processAnonymizedContent(anonymizedContent: string): Promise<any> {
    // Validate that content is truly anonymized
    const isValid = await this.validateAnonymization(anonymizedContent);
    
    if (!isValid) {
      throw new Error('Content failed anonymization validation - processing denied');
    }

    // Content is safe for AI processing
    return {
      content: anonymizedContent,
      safeForProcessing: true,
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * Optional Re-personalization with explicit consent
   */
  async personalizeResults(request: PersonalizationRequest): Promise<PersonalizedResult> {
    try {
      // Retrieve encrypted PII data
      const piiItems = await this.storage.retrievePII(request.sessionId, request.encryptionKey);

      // Apply personalization based on consent
      let personalizedText = request.anonymizedText;
      const dataUsage: string[] = [];

      // Replace tokens with actual PII based on consent
      for (const piiItem of piiItems) {
        if (this.shouldIncludePII(piiItem.type, request.consent)) {
          personalizedText = personalizedText.replace(
            new RegExp(piiItem.replacementToken, 'g'),
            piiItem.value
          );
          dataUsage.push(`${piiItem.type}: Used for personalization with consent`);
        }
      }

      // Generate privacy notice
      const privacyNote = this.generatePrivacyNote(request.consent, dataUsage);

      return {
        personalizedText,
        privacyNote,
        dataUsage
      };

    } catch (error) {
      console.error('Personalization failed:', error);
      throw new Error('Failed to personalize results');
    }
  }

  /**
   * Generate transparency report for user
   */
  async generateTransparencyReport(
    sessionId: string, 
    encryptionKey: string,
    userConsent: PersonalizationConsent
  ): Promise<PIITransparencyReport> {
    try {
      const piiItems = await this.storage.retrievePII(sessionId, encryptionKey);

      const detectedPII = piiItems.map(item => ({
        type: item.type,
        description: this.getPIIDescription(item.type),
        usage: this.getPIIUsage(item.type, userConsent),
        retention: this.getRetentionInfo(userConsent.dataRetention)
      }));

      const anonymizedFields = piiItems.map(item => item.replacementToken);

      return {
        sessionId,
        detectedPII,
        anonymizedFields,
        userChoices: userConsent
      };

    } catch (error) {
      console.error('Failed to generate transparency report:', error);
      throw new Error('Transparency report generation failed');
    }
  }

  /**
   * Immediate data deletion on user request
   */
  async deleteUserData(sessionId: string): Promise<void> {
    try {
      await this.storage.purgePII(sessionId);
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw new Error('Data deletion failed');
    }
  }

  /**
   * Get audit trail for compliance
   */
  async getAuditTrail(sessionId: string) {
    // Implementation would depend on storage backend
    return { sessionId, message: 'Audit trail available through secure storage' };
  }

  // Private helper methods

  private generateSessionSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  private shouldIncludePII(piiType: PIIType, consent: PersonalizationConsent): boolean {
    switch (piiType) {
      case PIIType.FULL_NAME:
        return consent.includeName;
      case PIIType.PREMIUM_AMOUNT:
        return consent.includePremium;
      case PIIType.ADDRESS:
        return consent.includeAddress;
      default:
        return false; // Conservative default - no personalization for other PII types
    }
  }

  private getPIIDescription(piiType: PIIType): string {
    const descriptions: Record<PIIType, string> = {
      [PIIType.FULL_NAME]: 'We detected a name in your document',
      [PIIType.ADDRESS]: 'We detected an address in your document', 
      [PIIType.PHONE]: 'We detected a phone number in your document',
      [PIIType.EMAIL]: 'We detected an email address in your document',
      [PIIType.PREMIUM_AMOUNT]: 'We detected premium amounts in your document',
      [PIIType.POLICY_NUMBER]: 'We detected policy numbers in your document',
      [PIIType.DATE_OF_BIRTH]: 'We detected a date of birth in your document',
      [PIIType.MEDICAL_CONDITION]: 'We detected medical information in your document',
      [PIIType.BANK_ACCOUNT]: 'We detected bank account details in your document',
      [PIIType.MEDICARE_NUMBER]: 'We detected a Medicare number in your document',
      [PIIType.TAX_FILE_NUMBER]: 'We detected a Tax File Number in your document'
    };

    return descriptions[piiType] || 'We detected personal information in your document';
  }

  private getPIIUsage(piiType: PIIType, consent: PersonalizationConsent): string {
    if (this.shouldIncludePII(piiType, consent)) {
      return 'Used for personalized recommendations (with your consent)';
    }
    return 'Anonymized for AI analysis only - not used for personalization';
  }

  private getRetentionInfo(retention: PersonalizationConsent['dataRetention']): string {
    const retentionMap = {
      'session-only': 'Deleted when you close your browser',
      '1-hour': 'Automatically deleted after 1 hour',
      '24-hours': 'Automatically deleted after 24 hours (maximum retention)'
    };

    return retentionMap[retention];
  }

  private generatePrivacyNote(consent: PersonalizationConsent, dataUsage: string[]): string {
    const usageList = dataUsage.length > 0 
      ? `\n\nPersonal data used: ${dataUsage.join(', ')}`
      : '\n\nNo personal data used in these results.';

    return `Privacy Notice: Your data is processed according to your consent preferences. ` +
           `Data retention: ${this.getRetentionInfo(consent.dataRetention)}.${usageList}`;
  }
}

/**
 * Global PII protection service instance
 */
export const piiProtectionService = new PIIProtectionService();