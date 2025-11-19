/**
 * PII Protection System Integration Test
 * Tests the complete PII detection, encryption, and anonymization pipeline
 */

import { PIIDetectionService, PIIType } from '../lib/security/pii-detector';
import { PIIProtectionService } from '../lib/security/pii-protection';
import { ConsentManager } from '../lib/security/privacy-controls';

// Test document with various PII types
const testDocument = `
PRIVATE HEALTH INSURANCE POLICY STATEMENT

Policy Holder: John Michael Smith
Date of Birth: 15/03/1985
Address: 123 Collins Street, Melbourne VIC 3000
Phone: 0412 345 678
Email: john.smith@email.com
Medicare Number: 1234 5678 91 2
Tax File Number: 123 456 789

CURRENT POLICY DETAILS
Policy Number: PHI123456789
Premium: $450.75 per month
Account BSB: 083-234
Account Number: 12345678

MEDICAL HISTORY
Pre-existing conditions: Type 2 Diabetes, High Blood Pressure
Current medications: Metformin, Amlodipine

Dr. Sarah Wilson
Wilson Medical Centre
456 Burke Road, Camberwell VIC 3124
Phone: (03) 9823 4567
`;

describe('PII Protection System', () => {
  let piiDetectionService: PIIDetectionService;
  let piiProtectionService: PIIProtectionService;
  let consentManager: ConsentManager;

  beforeEach(() => {
    piiDetectionService = new PIIDetectionService();
    piiProtectionService = new PIIProtectionService();
    consentManager = new ConsentManager();
  });

  describe('PII Detection', () => {
    test('should detect all major PII types in insurance document', async () => {
      const result = await piiDetectionService.detectPII(testDocument);
      
      expect(result.detectedPII.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Check for specific PII types
      const detectedTypes = result.detectedPII.map(item => item.type);
      expect(detectedTypes).toContain(PIIType.FULL_NAME);
      expect(detectedTypes).toContain(PIIType.EMAIL);
      expect(detectedTypes).toContain(PIIType.PHONE);
      expect(detectedTypes).toContain(PIIType.ADDRESS);
      expect(detectedTypes).toContain(PIIType.PREMIUM_AMOUNT);
    });

    test('should create proper replacement tokens', async () => {
      const result = await piiDetectionService.detectPII(testDocument);
      
      result.detectedPII.forEach(item => {
        expect(item.replacementToken).toMatch(/^\[.+_\d+\]$/);
        expect(item.startIndex).toBeGreaterThanOrEqual(0);
        expect(item.endIndex).toBeGreaterThan(item.startIndex);
        expect(item.confidence).toBeGreaterThan(0);
      });
    });

    test('should produce anonymized content without PII', async () => {
      const result = await piiDetectionService.detectPII(testDocument);
      
      // Anonymized content should not contain original PII values
      const containsEmail = result.anonymizedContent.includes('john.smith@email.com');
      const containsPhone = result.anonymizedContent.includes('0412 345 678');
      const containsName = result.anonymizedContent.includes('John Michael Smith');
      
      expect(containsEmail).toBe(false);
      expect(containsPhone).toBe(false);
      expect(containsName).toBe(false);
      
      // But should contain replacement tokens
      expect(result.anonymizedContent).toMatch(/\[EMAIL_\d+\]/);
      expect(result.anonymizedContent).toMatch(/\[PHONE_\d+\]/);
      expect(result.anonymizedContent).toMatch(/\[FULL_NAME_\d+\]/);
    });

    test('should validate anonymization quality', async () => {
      const result = await piiDetectionService.detectPII(testDocument);
      const isValid = await piiDetectionService.validateDetection(testDocument, result);
      
      expect(isValid).toBe(true);
    });
  });

  describe('PII Protection Pipeline', () => {
    test('should complete full protection pipeline', async () => {
      const sessionId = 'test-session-123';
      
      // Step 1: Detect and isolate PII
      const anonymizedDoc = await piiProtectionService.detectAndIsolatePII(
        testDocument, 
        sessionId
      );
      
      expect(anonymizedDoc.sessionId).toBe(sessionId);
      expect(anonymizedDoc.piiDetected).toBe(true);
      expect(anonymizedDoc.encryptionKey).toBeDefined();
      expect(anonymizedDoc.detectionConfidence).toBeGreaterThan(0);
      
      // Step 2: Validate anonymization
      const isValidAnonymization = await piiProtectionService.validateAnonymization(
        anonymizedDoc.anonymizedContent
      );
      expect(isValidAnonymization).toBe(true);
      
      // Step 3: Process anonymized content
      const processedResult = await piiProtectionService.processAnonymizedContent(
        anonymizedDoc.anonymizedContent
      );
      expect(processedResult.safeForProcessing).toBe(true);
    });

    test('should handle documents without PII', async () => {
      const cleanDocument = 'This is a generic insurance policy with no personal information.';
      const sessionId = 'clean-session-123';
      
      const result = await piiProtectionService.detectAndIsolatePII(
        cleanDocument, 
        sessionId
      );
      
      expect(result.piiDetected).toBe(false);
      expect(result.encryptionKey).toBeUndefined();
      expect(result.anonymizedContent).toBe(cleanDocument);
    });

    test('should support personalization with consent', async () => {
      const sessionId = 'personalize-session-123';
      
      // Initial PII detection and storage
      const anonymizedDoc = await piiProtectionService.detectAndIsolatePII(
        testDocument, 
        sessionId
      );
      
      if (anonymizedDoc.encryptionKey) {
        // Personalize with consent
        const personalizedResult = await piiProtectionService.personalizeResults({
          sessionId,
          encryptionKey: anonymizedDoc.encryptionKey,
          consent: {
            includeName: true,
            includePremium: true,
            includeAddress: false,
            dataRetention: '1-hour'
          },
          anonymizedText: anonymizedDoc.anonymizedContent
        });
        
        expect(personalizedResult.personalizedText).toBeDefined();
        expect(personalizedResult.privacyNote).toContain('Privacy Notice');
        expect(personalizedResult.dataUsage.length).toBeGreaterThan(0);
      }
    });

    test('should generate transparency reports', async () => {
      const sessionId = 'transparency-session-123';
      
      const anonymizedDoc = await piiProtectionService.detectAndIsolatePII(
        testDocument, 
        sessionId
      );
      
      if (anonymizedDoc.encryptionKey) {
        const consent = {
          includeName: true,
          includePremium: false,
          includeAddress: true,
          dataRetention: '24-hours' as const
        };
        
        const report = await piiProtectionService.generateTransparencyReport(
          sessionId,
          anonymizedDoc.encryptionKey,
          consent
        );
        
        expect(report.sessionId).toBe(sessionId);
        expect(report.detectedPII.length).toBeGreaterThan(0);
        expect(report.anonymizedFields.length).toBeGreaterThan(0);
        expect(report.userChoices).toEqual(consent);
      }
    });

    test('should support data deletion', async () => {
      const sessionId = 'deletion-session-123';
      
      // Create some PII data
      await piiProtectionService.detectAndIsolatePII(testDocument, sessionId);
      
      // Delete the data
      await piiProtectionService.deleteUserData(sessionId);
      
      // Verify data is deleted (should throw error when trying to access)
      await expect(
        piiProtectionService.generateTransparencyReport(sessionId, 'fake-key', {
          includeName: false,
          includePremium: false,
          includeAddress: false,
          dataRetention: 'session-only'
        })
      ).rejects.toThrow();
    });
  });

  describe('Consent Management', () => {
    test('should record and retrieve consent', async () => {
      const sessionId = 'consent-session-123';
      const testConsent = {
        includeName: true,
        includePremium: true,
        includeAddress: false,
        dataRetention: '1-hour' as const
      };
      
      await consentManager.recordConsent(
        sessionId,
        testConsent,
        '127.0.0.1',
        'test-user-agent'
      );
      
      const retrievedConsent = await consentManager.getConsent(sessionId);
      expect(retrievedConsent).toEqual(testConsent);
    });

    test('should provide default privacy controls', () => {
      const defaultControls = consentManager.getDefaultPrivacyControls();
      
      expect(defaultControls.defaultMode).toBe('anonymous-only');
      expect(defaultControls.enhancementOptions.personalizedGreeting).toBe(false);
      expect(defaultControls.enhancementOptions.premiumComparison).toBe(false);
      expect(defaultControls.enhancementOptions.locationBasedProviders).toBe(false);
    });

    test('should update consent preferences', async () => {
      const sessionId = 'update-consent-session-123';
      
      // Initial consent
      const initialConsent = {
        includeName: false,
        includePremium: false,
        includeAddress: false,
        dataRetention: 'session-only' as const
      };
      
      await consentManager.recordConsent(
        sessionId,
        initialConsent,
        '127.0.0.1',
        'test-user-agent'
      );
      
      // Updated consent
      const updatedConsent = {
        includeName: true,
        includePremium: true,
        includeAddress: false,
        dataRetention: '1-hour' as const
      };
      
      await consentManager.updateConsent(
        sessionId,
        updatedConsent,
        '127.0.0.1',
        'test-user-agent'
      );
      
      const finalConsent = await consentManager.getConsent(sessionId);
      expect(finalConsent).toEqual(updatedConsent);
    });
  });

  describe('Security and Compliance', () => {
    test('should use proper encryption for PII storage', async () => {
      const sessionId = 'encryption-test-123';
      
      const result = await piiProtectionService.detectAndIsolatePII(
        testDocument,
        sessionId
      );
      
      // Encryption key should be provided when PII is detected
      if (result.piiDetected) {
        expect(result.encryptionKey).toBeDefined();
        expect(result.encryptionKey).toHaveLength(64); // 32 bytes as hex string
      }
    });

    test('should fail gracefully with invalid encryption keys', async () => {
      const sessionId = 'invalid-key-test-123';
      
      // Create PII data
      const result = await piiProtectionService.detectAndIsolatePII(
        testDocument,
        sessionId
      );
      
      if (result.encryptionKey) {
        // Try to access with wrong key
        await expect(
          piiProtectionService.generateTransparencyReport(
            sessionId,
            'invalid-encryption-key',
            consentManager.getDefaultConsent()
          )
        ).rejects.toThrow();
      }
    });

    test('should audit trail access attempts', async () => {
      const sessionId = 'audit-test-123';
      
      // Create PII data and access it multiple times
      const result = await piiProtectionService.detectAndIsolatePII(
        testDocument,
        sessionId
      );
      
      if (result.encryptionKey) {
        // Multiple access attempts
        await piiProtectionService.generateTransparencyReport(
          sessionId,
          result.encryptionKey,
          consentManager.getDefaultConsent()
        );
        
        await piiProtectionService.personalizeResults({
          sessionId,
          encryptionKey: result.encryptionKey,
          consent: {
            includeName: true,
            includePremium: false,
            includeAddress: false,
            dataRetention: 'session-only'
          },
          anonymizedText: result.anonymizedContent
        });
        
        // Audit trail should be available (implementation specific)
        const auditTrail = await piiProtectionService.getAuditTrail(sessionId);
        expect(auditTrail).toBeDefined();
      }
    });
  });
});

// Export test utilities for use in other test files
export const testData = {
  testDocument,
  createTestSession: () => `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  getTestConsent: (overrides = {}) => ({
    includeName: false,
    includePremium: false,
    includeAddress: false,
    dataRetention: 'session-only' as const,
    ...overrides
  })
};