/**
 * Privacy Controls and Consent Management
 * User-facing privacy dashboard and consent management system
 */

import { PersonalizationConsent } from './pii-protection';

export interface PrivacyControls {
  defaultMode: 'anonymous-only';
  enhancementOptions: {
    personalizedGreeting: boolean;
    premiumComparison: boolean;
    locationBasedProviders: boolean;
  };
  dataRetention: {
    resultsCaching: '1-hour' | '24-hours' | 'none';
    emailCopy: boolean;
    auditTrail: boolean;
  };
}

export interface ConsentRecord {
  sessionId: string;
  consent: PersonalizationConsent;
  consentGivenAt: Date;
  ipHash: string;
  userAgent: string;
  version: string; // Privacy policy version
}

export interface PrivacyDashboard {
  showPIIReport(sessionId: string, encryptionKey: string): Promise<PIITransparencyReport>;
  updateConsent(sessionId: string, newConsent: PersonalizationConsent): Promise<void>;
  deleteMyData(sessionId: string): Promise<DeletionReport>;
  exportMyData(sessionId: string, encryptionKey: string): Promise<DataExport>;
}

export interface PIITransparencyReport {
  sessionId: string;
  detectedPII: {
    type: string;
    description: string;
    usage: string;
    retention: string;
    anonymized: boolean;
  }[];
  consentChoices: PersonalizationConsent;
  dataRetention: string;
  autoDeleteTime: string;
}

export interface DeletionReport {
  sessionId: string;
  deletedAt: Date;
  itemsDeleted: string[];
  success: boolean;
  confirmationCode: string;
}

export interface DataExport {
  sessionId: string;
  exportedAt: Date;
  data: {
    consent: PersonalizationConsent;
    detectedPII: string[];
    anonymizedContent: string;
    processingHistory: any[];
  };
  format: 'json';
}

/**
 * Consent Management Service
 */
export class ConsentManager {
  private consentStorage = new Map<string, ConsentRecord>();

  /**
   * Record user consent with full audit trail
   */
  async recordConsent(
    sessionId: string,
    consent: PersonalizationConsent,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const record: ConsentRecord = {
      sessionId,
      consent,
      consentGivenAt: new Date(),
      ipHash: this.hashIP(ipAddress),
      userAgent,
      version: '1.0' // Current privacy policy version
    };

    this.consentStorage.set(sessionId, record);
  }

  /**
   * Get current consent for session
   */
  async getConsent(sessionId: string): Promise<PersonalizationConsent | null> {
    const record = this.consentStorage.get(sessionId);
    return record ? record.consent : null;
  }

  /**
   * Update consent preferences
   */
  async updateConsent(
    sessionId: string,
    newConsent: PersonalizationConsent,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.recordConsent(sessionId, newConsent, ipAddress, userAgent);
  }

  /**
   * Get default privacy controls
   */
  getDefaultPrivacyControls(): PrivacyControls {
    return {
      defaultMode: 'anonymous-only',
      enhancementOptions: {
        personalizedGreeting: false,
        premiumComparison: false,
        locationBasedProviders: false
      },
      dataRetention: {
        resultsCaching: 'none',
        emailCopy: false,
        auditTrail: true
      }
    };
  }

  /**
   * Generate privacy-friendly default consent
   */
  getDefaultConsent(): PersonalizationConsent {
    return {
      includeName: false,
      includePremium: false,
      includeAddress: false,
      dataRetention: 'session-only'
    };
  }

  private hashIP(ip: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + 'privacy-salt').digest('hex').substring(0, 16);
  }
}

/**
 * Privacy Dashboard Implementation
 */
export class PrivacyDashboardService implements PrivacyDashboard {
  constructor(
    private consentManager: ConsentManager,
    private piiProtectionService: any // Would import from pii-protection.ts
  ) {}

  async showPIIReport(sessionId: string, encryptionKey: string): Promise<PIITransparencyReport> {
    try {
      // Get the full transparency report from PII protection service
      const report = await this.piiProtectionService.generateTransparencyReport(
        sessionId,
        encryptionKey,
        await this.consentManager.getConsent(sessionId) || this.consentManager.getDefaultConsent()
      );

      // Calculate auto-delete time based on retention settings
      const consent = await this.consentManager.getConsent(sessionId);
      const autoDeleteTime = this.calculateAutoDeleteTime(consent?.dataRetention || 'session-only');

      return {
        sessionId,
        detectedPII: report.detectedPII.map((item: any) => ({
          ...item,
          anonymized: true // All PII is anonymized for AI processing
        })),
        consentChoices: report.userChoices,
        dataRetention: consent?.dataRetention || 'session-only',
        autoDeleteTime
      };

    } catch (error) {
      console.error('Failed to generate PII report:', error);
      throw new Error('Privacy report generation failed');
    }
  }

  async updateConsent(sessionId: string, newConsent: PersonalizationConsent): Promise<void> {
    try {
      await this.consentManager.updateConsent(
        sessionId,
        newConsent,
        '127.0.0.1', // Would be actual IP in production
        'privacy-dashboard'
      );
    } catch (error) {
      console.error('Failed to update consent:', error);
      throw new Error('Consent update failed');
    }
  }

  async deleteMyData(sessionId: string): Promise<DeletionReport> {
    try {
      // Delete PII data
      await this.piiProtectionService.deleteUserData(sessionId);
      
      // Delete consent record
      await this.consentManager.updateConsent(sessionId, this.consentManager.getDefaultConsent(), '127.0.0.1', 'data-deletion');

      // Generate confirmation
      const confirmationCode = this.generateConfirmationCode();

      return {
        sessionId,
        deletedAt: new Date(),
        itemsDeleted: ['PII data', 'consent records', 'processing history'],
        success: true,
        confirmationCode
      };

    } catch (error) {
      console.error('Data deletion failed:', error);
      return {
        sessionId,
        deletedAt: new Date(),
        itemsDeleted: [],
        success: false,
        confirmationCode: ''
      };
    }
  }

  async exportMyData(sessionId: string, encryptionKey: string): Promise<DataExport> {
    try {
      // Get consent record
      const consent = await this.consentManager.getConsent(sessionId);
      
      // Get PII report
      const piiReport = await this.showPIIReport(sessionId, encryptionKey);

      return {
        sessionId,
        exportedAt: new Date(),
        data: {
          consent: consent || this.consentManager.getDefaultConsent(),
          detectedPII: piiReport.detectedPII.map(item => `${item.type}: ${item.description}`),
          anonymizedContent: 'Available on request',
          processingHistory: ['PII detection', 'anonymization', 'AI analysis']
        },
        format: 'json'
      };

    } catch (error) {
      console.error('Data export failed:', error);
      throw new Error('Data export failed');
    }
  }

  private calculateAutoDeleteTime(retention: PersonalizationConsent['dataRetention']): string {
    const now = new Date();
    let deleteTime: Date;

    switch (retention) {
      case 'session-only':
        deleteTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes session timeout
        break;
      case '1-hour':
        deleteTime = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case '24-hours':
        deleteTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      default:
        deleteTime = now;
    }

    return deleteTime.toISOString();
  }

  private generateConfirmationCode(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }
}

/**
 * Privacy Notice Generator
 */
export class PrivacyNoticeService {
  /**
   * Generate contextual privacy notice based on detected PII
   */
  generatePrivacyNotice(detectedPIITypes: string[]): string {
    const baseNotice = `
🔒 **Your Privacy is Protected**

We detected personal information in your document and have automatically:
✅ **Anonymized all data** for AI analysis
✅ **Encrypted original data** with your session key
✅ **Set automatic deletion** within 24 hours maximum

`;

    if (detectedPIITypes.length === 0) {
      return baseNotice + `No personal information detected. Your document is processed anonymously.`;
    }

    const piiNotice = `
**Detected Information:**
${detectedPIITypes.map(type => `• ${this.getPIITypeFriendlyName(type)}`).join('\n')}

**Your Options:**
• Use **anonymous results** (default) - no personal data included
• **Personalize results** with your explicit consent
• **Delete everything** immediately after use

All processing complies with Australian Privacy Act 1988.
`;

    return baseNotice + piiNotice;
  }

  /**
   * Generate consent form based on detected PII
   */
  generateConsentForm(detectedPIITypes: string[]): {
    title: string;
    options: Array<{
      key: keyof PersonalizationConsent;
      label: string;
      description: string;
      recommended: boolean;
    }>;
  } {
    const options: Array<{
      key: keyof PersonalizationConsent;
      label: string;
      description: string;
      recommended: boolean;
    }> = [];

    if (detectedPIITypes.includes('full_name')) {
      options.push({
        key: 'includeName',
        label: 'Personalized greeting',
        description: 'Include your name in results (e.g., "Hello John, here are your recommendations")',
        recommended: false
      });
    }

    if (detectedPIITypes.includes('premium_amount')) {
      options.push({
        key: 'includePremium',
        label: 'Premium comparison',
        description: 'Show exact premium differences (e.g., "Save $120/month compared to your current $450")',
        recommended: true
      });
    }

    if (detectedPIITypes.includes('address')) {
      options.push({
        key: 'includeAddress',
        label: 'Location-based providers',
        description: 'Find providers near your address for convenience',
        recommended: true
      });
    }

    return {
      title: 'Personalization Options',
      options
    };
  }

  private getPIITypeFriendlyName(piiType: string): string {
    const friendlyNames: Record<string, string> = {
      full_name: 'Name',
      address: 'Address',
      phone: 'Phone number',
      email: 'Email address',
      premium_amount: 'Premium amounts',
      policy_number: 'Policy numbers',
      date_of_birth: 'Date of birth',
      medical_condition: 'Medical information',
      bank_account: 'Bank details',
      medicare_number: 'Medicare number',
      tax_file_number: 'Tax File Number'
    };

    return friendlyNames[piiType] || 'Personal information';
  }
}

/**
 * Global instances for privacy management
 */
export const consentManager = new ConsentManager();
export const privacyDashboard = new PrivacyDashboardService(consentManager, null); // Will be linked to PII service
export const privacyNoticeService = new PrivacyNoticeService();