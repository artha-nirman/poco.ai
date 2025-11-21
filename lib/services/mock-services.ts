// Mock services for cost-free development and testing
import { 
  DocumentProcessor,
  LLMProvider,
  PIIProtectionService,
  StorageService,
  CacheService,
  EmailService
} from './interfaces';
import { 
  PolicyFeatures, 
  PIIData, 
  EncryptedPIIData, 
  AnonymizedDocument,
  ComparisonResult,
  AnalysisResults 
} from '@/lib/types';
import { PROCESSING_MESSAGES, EMAIL_MESSAGES, PRIVACY_CONFIG } from '@/lib/constants';

export class MockDocumentProcessor implements DocumentProcessor {
  async processDocument(buffer: Buffer, filename?: string) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      text: `
        HEALTH INSURANCE POLICY
        
        Policy Holder: [NAME_1]
        Address: [ADDRESS_1]
        Phone: [PHONE_1]
        
        Policy Details:
        - Policy Type: Combined Hospital & Extras
        - Premium: $[PREMIUM_1] per month
        - Excess: $500 for hospital services
        - Policy Number: [POLICY_NUM_1]
        
        Hospital Coverage:
        - Private hospital accommodation
        - Choice of doctor for many services
        - Emergency ambulance cover
        - Day surgery and procedures
        
        Extras Coverage:
        - General dental: $800 annual limit
        - Major dental: $1,200 annual limit  
        - Optical: $300 every 2 years
        - Physiotherapy: $500 annual limit
        - Psychology: 8 sessions per year
        
        Waiting Periods:
        - Hospital services: 12 months
        - Extras services: 2 months
        - Pre-existing conditions: 12 months
        
        Exclusions:
        - Cosmetic surgery
        - Experimental treatments
        - Overseas treatment
      `,
      tables: [
        {
          headers: ['Coverage Type', 'Single', 'Couple', 'Family'],
          rows: [
            ['Hospital Premium', '$45/month', '$90/month', '$135/month'],
            ['Extras Premium', '$25/month', '$50/month', '$75/month'],
            ['Total Premium', '$70/month', '$140/month', '$210/month']
          ],
          confidence: 0.95,
          pageNumber: 1
        }
      ],
      entities: [
        {
          type: 'premium_amount',
          value: '$70',
          confidence: 0.92,
          boundingBox: { vertices: [{ x: 100, y: 200 }, { x: 130, y: 200 }, { x: 130, y: 220 }, { x: 100, y: 220 }] }
        },
        {
          type: 'policy_number',
          value: 'POL123456',
          confidence: 0.98,
          boundingBox: { vertices: [{ x: 150, y: 100 }, { x: 220, y: 100 }, { x: 220, y: 120 }, { x: 150, y: 120 }] }
        }
      ],
      layout: {
        pages: [
          {
            pageNumber: 1,
            textBlocks: [
              {
                text: 'HEALTH INSURANCE POLICY',
                confidence: 0.99,
                boundingBox: {}
              },
              {
                text: 'Policy Details Section',
                confidence: 0.95,
                boundingBox: {}
              }
            ]
          }
        ]
      },
      confidence: 0.94,
      processingTime: 1500
    };
  }
}

export class MockLLMProvider implements LLMProvider {
  async analyzeFeatures(content: string): Promise<PolicyFeatures> {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      policyType: 'combined',
      policyTier: 'silver',
      premiumCategory: '400-600',
      excessCategory: '500-1000',
      hospitalFeatures: [
        'private_hospital',
        'choice_of_doctor', 
        'emergency_ambulance',
        'day_surgery',
        'accommodation'
      ],
      extrasFeatures: [
        'general_dental',
        'major_dental',
        'optical', 
        'physiotherapy',
        'psychology'
      ],
      waitingPeriods: {
        'hospital_services': '12 months',
        'extras_services': '2 months',
        'pre_existing': '12 months'
      },
      exclusions: [
        'cosmetic_surgery',
        'experimental_treatments', 
        'overseas_treatment'
      ],
      conditions: [
        'excess_applies_to_hospital',
        'annual_limits_on_extras',
        'session_limits_psychology'
      ]
    };
  }

  async generateEmbedding(content: string): Promise<number[]> {
    // Return mock 384-dimensional embedding
    return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
  }

  async explainRecommendation(comparison: ComparisonResult): Promise<string[]> {
    return [
      'Better value for money with similar coverage',
      'Lower waiting periods for extras services',
      'Higher annual limits for dental coverage',
      'Includes additional physiotherapy benefits'
    ];
  }
}

export class MockPIIProtectionService implements PIIProtectionService {
  async detectPII(content: string): Promise<PIIData[]> {
    const piiData: PIIData[] = [];
    
    // Mock PII detection patterns
    const patterns = [
      { regex: /\[NAME_\d+\]/g, type: 'name' as const },
      { regex: /\[ADDRESS_\d+\]/g, type: 'address' as const },
      { regex: /\[PHONE_\d+\]/g, type: 'phone' as const },
      { regex: /\[PREMIUM_\d+\]/g, type: 'premium' as const },
      { regex: /\[POLICY_NUM_\d+\]/g, type: 'policy_number' as const }
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        matches.forEach((match, index) => {
          piiData.push({
            type: pattern.type,
            value: match,
            confidence: 0.95,
            location: { page: 1, position: { x: 100 + index * 50, y: 200 + index * 20 } }
          });
        });
      }
    });

    return piiData;
  }

  async isolatePII(content: string, piiData: PIIData[]): Promise<{
    encryptedPII: EncryptedPIIData;
    anonymizedDocument: AnonymizedDocument;
    piiKey: string;
  }> {
    const piiKey = `mock_key_${Date.now()}`;
    
    // Create anonymized content by replacing PII with tokens
    let anonymizedContent = content;
    piiData.forEach((pii, index) => {
      anonymizedContent = anonymizedContent.replace(pii.value, `[${pii.type.toUpperCase()}_${index + 1}]`);
    });

    const encryptedPII: EncryptedPIIData = {
      sessionId: 'mock_session',
      encryptedData: Buffer.from(JSON.stringify(piiData), 'utf-8'), // Mock encryption
      encryptionSalt: Buffer.from('mock_salt', 'utf-8'),
      encryptionAlgorithm: 'AES-256-GCM',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    const anonymizedDocument: AnonymizedDocument = {
      sessionId: 'mock_session',
      anonymizedContent,
      piiTokenMap: Object.fromEntries(
        piiData.map((pii, index) => [`[${pii.type.toUpperCase()}_${index + 1}]`, pii.type])
      ),
      originalLength: content.length,
      anonymizedLength: anonymizedContent.length,
      piiItemsDetected: piiData.length
    };

    return { encryptedPII, anonymizedDocument, piiKey };
  }

  async personalizeResults(
    results: AnalysisResults, 
    piiKey: string, 
    userConsent: boolean
  ): Promise<AnalysisResults> {
    if (!userConsent) {
      return results;
    }

    // Mock personalization - in real implementation, decrypt PII and add to results
    return {
      ...results,
      recommendations: results.recommendations.map(rec => ({
        ...rec,
        reasoning: [
          ...rec.reasoning,
          'Based on your current premium of $450/month',
          'Considering your family coverage needs'
        ]
      }))
    };
  }

  async purgeExpiredPII(): Promise<number> {
    // Mock purge operation
    return Math.floor(Math.random() * 10);
  }
}

export class MockStorageService implements StorageService {
  private storage = new Map<string, Buffer>();

  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    const mockUrl = `mock://storage/${filename}_${Date.now()}`;
    this.storage.set(mockUrl, buffer);
    return mockUrl;
  }

  async downloadFile(url: string): Promise<Buffer> {
    const buffer = this.storage.get(url);
    if (!buffer) {
      throw new Error(`File not found: ${url}`);
    }
    return buffer;
  }

  async deleteFile(url: string): Promise<void> {
    this.storage.delete(url);
  }
}

export class MockCacheService implements CacheService {
  private cache = new Map<string, { value: any; expires?: number }>();
  private cacheFile: string;
  private initialized = false;

  constructor() {
    // Use temp directory for cache persistence in development
    const os = require('os');
    const path = require('path');
    const fs = require('fs');
    
    this.cacheFile = path.join(os.tmpdir(), 'poco-dev-cache.json');
    this.loadCache();
  }

  private loadCache(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Restore cache with expiry check
        Object.entries(parsed).forEach(([key, item]: [string, any]) => {
          if (!item.expires || Date.now() < item.expires) {
            this.cache.set(key, item);
          }
        });
        
        console.log(`📦 Loaded ${this.cache.size} items from persistent cache`);
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
    this.initialized = true;
  }

  private saveCache(): void {
    if (!this.initialized) return;
    
    try {
      const fs = require('fs');
      const cacheData = Object.fromEntries(this.cache.entries());
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      this.saveCache();
      return null;
    }
    
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.cache.set(key, { value, expires });
    this.saveCache();
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.saveCache();
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
}

export class MockEmailService implements EmailService {
  private emailLog: any[] = [];

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    console.log(`📧 MOCK EMAIL SENT`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${htmlContent.substring(0, 100)}...`);
    
    this.emailLog.push({ to, subject, content: htmlContent, sentAt: new Date() });
  }

  async sendAnalysisResults(to: string, results: AnalysisResults): Promise<void> {
    await this.sendEmail(
      to,
      EMAIL_MESSAGES.ANALYSIS_COMPLETE_SUBJECT,
      `<h1>${EMAIL_MESSAGES.ANALYSIS_INTRO}</h1><p>Found ${results.recommendations.length} recommendations.</p>`
    );
  }

  async sendProgressUpdate(to: string, progress: any): Promise<void> {
    await this.sendEmail(
      to,
      EMAIL_MESSAGES.PROGRESS_UPDATE_SUBJECT,
      `<p>Progress: ${progress.progress}% - ${progress.message}</p>`
    );
  }

  getEmailLog() {
    return this.emailLog;
  }
}

// Service factory for easy switching between mock and real services
export class ServiceFactory {
  static createDocumentProcessor(): DocumentProcessor {
    // Use real Google Document AI if credentials are configured
    const useGoogle = process.env.GOOGLE_CLOUD_PROJECT_ID && 
                     process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID &&
                     process.env.MOCK_AI_SERVICES !== 'true';
    
    if (useGoogle) {
      console.log('🔧 Using Google Cloud Document AI');
      // Import dynamically to avoid issues if package not installed
      try {
        const { GoogleDocumentProcessor } = require('./google-document-processor');
        return new GoogleDocumentProcessor();
      } catch (error) {
        console.warn('❌ Failed to load Google Document AI, falling back to mock:', error);
        return new MockDocumentProcessor();
      }
    }
    
    console.log('🔧 Using Mock Document Processor');
    return new MockDocumentProcessor();
  }

  static createLLMProvider(): LLMProvider {
    // Use real Gemini if API key is configured
    const useGemini = process.env.GOOGLE_GEMINI_API_KEY && process.env.MOCK_AI_SERVICES !== 'true';
    
    if (useGemini) {
      console.log('🔧 Using Gemini LLM Provider');
      // Import dynamically to avoid issues if package not installed
      try {
        const { GeminiLLMProvider } = require('./gemini-llm-provider');
        return new GeminiLLMProvider();
      } catch (error) {
        console.warn('❌ Failed to load Gemini LLM, falling back to mock:', error);
        return new MockLLMProvider();
      }
    }
    
    console.log('🔧 Using Mock LLM Provider');
    return new MockLLMProvider();
  }

  static createPIIProtectionService(): PIIProtectionService {
    return new MockPIIProtectionService();
  }

  static createStorageService(): StorageService {
    const useLocal = process.env.STORAGE_PROVIDER === 'local' || process.env.NODE_ENV === 'development';
    
    if (useLocal) {
      return new MockStorageService();
    }
    
    // TODO: Return real Vercel Blob service
    throw new Error('Real StorageService not implemented yet');
  }

  static createCacheService(): CacheService {
    const useInMemory = process.env.USE_IN_MEMORY_CACHE === 'true' || process.env.NODE_ENV === 'development';
    
    if (useInMemory) {
      return new MockCacheService();
    }
    
    // TODO: Return real Vercel KV service
    throw new Error('Real CacheService not implemented yet');
  }

  static createEmailService(): EmailService {
    const useMock = process.env.EMAIL_PROVIDER === 'mock' || process.env.NODE_ENV === 'test';
    
    if (useMock) {
      return new MockEmailService();
    }
    
    // TODO: Return real Resend service
    throw new Error('Real EmailService not implemented yet');
  }
}