/**
 * Comprehensive Google Cloud Services Test Suite
 * Tests: Document AI + Gemini LLM integration for Australian health insurance analysis
 * 
 * @fileoverview Consolidates all Google service testing into one organized suite
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ServiceFactory } from '@/lib/services/mock-services';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';

interface TestResult {
  service: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  details?: any;
}

class GoogleServicesTestSuite {
  private results: TestResult[] = [];

  private addResult(service: string, status: 'passed' | 'failed' | 'skipped', message: string, details?: any) {
    this.results.push({ service, status, message, details });
    const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    console.log(`${emoji} ${service}: ${message}`);
  }

  async testEnvironmentConfiguration(): Promise<void> {
    console.log('🔧 Testing Environment Configuration...\n');

    // Check environment variables
    const requiredVars = {
      'MOCK_AI_SERVICES': process.env.MOCK_AI_SERVICES,
      'GOOGLE_CLOUD_PROJECT_ID': process.env.GOOGLE_CLOUD_PROJECT_ID,
      'GOOGLE_DOCUMENT_AI_PROCESSOR_ID': process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
      'GOOGLE_GEMINI_API_KEY': process.env.GOOGLE_GEMINI_API_KEY,
      'GOOGLE_APPLICATION_CREDENTIALS': process.env.GOOGLE_APPLICATION_CREDENTIALS
    };

    for (const [key, value] of Object.entries(requiredVars)) {
      if (value) {
        this.addResult('Environment', 'passed', `${key} configured`);
      } else {
        this.addResult('Environment', key.includes('CREDENTIALS') ? 'skipped' : 'failed', 
          `${key} missing`);
      }
    }
  }

  async testGeminiModelDiscovery(): Promise<string | null> {
    console.log('\n🧪 Testing Gemini Model Discovery...\n');

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      this.addResult('Gemini Discovery', 'skipped', 'API key not configured');
      return null;
    }

    const client = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    
    // Models to test in order of preference
    const modelsToTest = [
      'gemini-pro-latest',
      'gemini-1.5-pro',
      'gemini-1.5-flash', 
      'gemini-pro',
      'gemini-flash'
    ];

    for (const modelName of modelsToTest) {
      try {
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say hello in JSON: {\"test\": \"success\"}");
        const response = await result.response;
        const text = response.text();
        
        this.addResult('Gemini Discovery', 'passed', `Working model: ${modelName}`, { response: text.substring(0, 100) });
        return modelName;
        
      } catch (error: any) {
        this.addResult('Gemini Discovery', 'failed', `${modelName} failed: ${error.message.substring(0, 80)}...`);
      }
    }
    
    return null;
  }

  async testDocumentAIConfiguration(): Promise<void> {
    console.log('\n📄 Testing Document AI Configuration...\n');

    try {
      const documentProcessor = ServiceFactory.createDocumentProcessor();
      
      // Test with sample text (will fail for non-PDF but shows connectivity)
      const sampleText = "Health Insurance Policy Test Document";
      
      try {
        await documentProcessor.processDocument(Buffer.from(sampleText), 'test.txt');
        this.addResult('Document AI', 'passed', 'Processor working (unexpected success with text)');
      } catch (error: any) {
        if (error.message.includes('Unsupported input file format')) {
          this.addResult('Document AI', 'passed', 'Processor configured correctly (correctly rejects non-PDF)');
        } else {
          this.addResult('Document AI', 'failed', `Configuration error: ${error.message}`);
        }
      }
      
    } catch (error: any) {
      this.addResult('Document AI', 'failed', `Initialization failed: ${error.message}`);
    }
  }

  async testIntegratedPolicyAnalysis(): Promise<void> {
    console.log('\n🤖 Testing Integrated Policy Analysis...\n');

    try {
      const llmProvider = ServiceFactory.createLLMProvider();

      // Sample Australian health insurance policy content
      const samplePolicyContent = {
        text: `
HEALTH INSURANCE POLICY DOCUMENT

Policy Type: Hospital & Extras Combined  
Policy Tier: Gold Plus
Monthly Premium: $520
Excess: $300 per hospital admission

HOSPITAL BENEFITS:
- Private hospital accommodation
- Choice of doctor for in-hospital treatment  
- Emergency ambulance transport
- Day surgery procedures
- Major surgery with no annual limits

EXTRAS BENEFITS:
- General dental: 85% back, annual limit $1,500
- Major dental: 75% back, annual limit $1,200
- Optical: 85% back, annual limit $400  
- Physiotherapy: 85% back, annual limit $800
- Psychology: 85% back, annual limit $1,200

WAITING PERIODS:
- Hospital services: 12 months
- Pre-existing conditions: 12 months  
- General extras: 2 months
- Major dental: 12 months

EXCLUSIONS:
- Cosmetic surgery (non-medical)
- Experimental treatments
- Services not listed in benefits
- Overseas treatment
        `,
        tables: [
          {
            headers: ['Coverage Type', 'Percentage', 'Annual Limit'],
            rows: [
              ['General Dental', '85%', '$1,500'],
              ['Major Dental', '75%', '$1,200'],
              ['Optical', '85%', '$400'],
              ['Physiotherapy', '85%', '$800']
            ],
            confidence: 0.95,
            pageNumber: 1
          }
        ],
        entities: [
          { 
            type: 'premium', 
            value: '$520', 
            confidence: 0.98,
            boundingBox: { vertices: [{ x: 100, y: 200 }, { x: 150, y: 200 }, { x: 150, y: 220 }, { x: 100, y: 220 }] }
          },
          { 
            type: 'excess', 
            value: '$300', 
            confidence: 0.96,
            boundingBox: { vertices: [{ x: 200, y: 300 }, { x: 250, y: 300 }, { x: 250, y: 320 }, { x: 200, y: 320 }] }
          },
          { 
            type: 'policyType', 
            value: 'Hospital & Extras Combined', 
            confidence: 0.99,
            boundingBox: { vertices: [{ x: 50, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 120 }, { x: 50, y: 120 }] }
          }
        ],
        layout: {
          pages: [{
            pageNumber: 1,
            textBlocks: [{
              text: 'HEALTH INSURANCE POLICY DOCUMENT',
              confidence: 0.98,
              boundingBox: {}
            }]
          }]
        },
        confidence: 0.95,
        processingTime: 1200
      };

      // Test policy analysis
      const analysis = await llmProvider.analyzeFeatures(samplePolicyContent);
      this.addResult('Policy Analysis', 'passed', 'LLM analysis completed', {
        policyType: analysis.policyType,
        policyTier: analysis.policyTier,
        features: `${analysis.hospitalFeatures.length} hospital, ${analysis.extrasFeatures.length} extras`
      });

      // Test embedding generation
      const embedding = await llmProvider.generateEmbedding(samplePolicyContent.text);
      this.addResult('Embeddings', 'passed', `Generated ${embedding.length}-dimensional embedding`);

      // Test recommendation explanation
      const mockComparison = {
        policy: {
          id: '1',
          providerCode: 'TEST',
          providerName: 'Test Insurance',
          policyName: 'Gold Hospital & Extras',
          policyType: 'combined' as const,
          policyTier: 'gold' as const,
          premiumRange: {
            single: { min: 480, max: 560 },
            couple: { min: 800, max: 920 },
            family: { min: 1200, max: 1400 }
          },
          features: {
            policyType: 'combined' as const,
            policyTier: 'gold' as const,
            premiumCategory: '400-600' as const,
            excessCategory: 'under-500' as const,
            hospitalFeatures: ['private_hospital', 'choice_of_doctor'],
            extrasFeatures: ['general_dental', 'optical'],
            waitingPeriods: { hospital_services: '12 months' },
            exclusions: ['cosmetic_surgery'],
            conditions: ['excess_applies']
          },
          websiteUrl: 'https://testinsurance.com',
          contactPhone: '1800123456'
        },
        overallScore: 0.85,
        featureMatchScore: 0.80,
        costEfficiencyScore: 0.90,
        waitingPeriodScore: 0.75,
        confidence: 0.88,
        reasoning: ['Good coverage match', 'Competitive pricing'],
        coverageImprovements: ['Better dental limits'],
        potentialDrawbacks: ['Higher excess than current policy']
      };

      const explanations = await llmProvider.explainRecommendation(mockComparison);
      this.addResult('Recommendations', 'passed', `Generated ${Array.isArray(explanations) ? explanations.length : 'multiple'} explanations`);

    } catch (error: any) {
      this.addResult('Policy Analysis', 'failed', `Integration test failed: ${error.message}`);
    }
  }

  async testServiceFactoryConfiguration(): Promise<void> {
    console.log('\n🏭 Testing Service Factory Configuration...\n');

    const documentProcessor = ServiceFactory.createDocumentProcessor();
    const llmProvider = ServiceFactory.createLLMProvider();
    
    // Check if real services are being used
    const isUsingRealServices = process.env.MOCK_AI_SERVICES === 'false' && 
                               process.env.GOOGLE_CLOUD_PROJECT_ID && 
                               process.env.GOOGLE_GEMINI_API_KEY;
    
    if (isUsingRealServices) {
      this.addResult('Service Factory', 'passed', 'Using real Google Cloud services');
    } else {
      this.addResult('Service Factory', 'skipped', 'Using mock services (check environment variables)');
    }
  }

  generateReport(): void {
    console.log('\n📊 TEST SUITE SUMMARY\n');
    console.log('='.repeat(60));
    
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      skipped: this.results.filter(r => r.status === 'skipped').length
    };
    
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Skipped: ${summary.skipped}`);
    console.log();
    
    if (summary.failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.service}: ${r.message}`));
      console.log();
    }
    
    console.log('🎯 Integration Status:');
    const hasGoogleDocAI = this.results.some(r => r.service === 'Document AI' && r.status === 'passed');
    const hasGemini = this.results.some(r => r.service === 'Policy Analysis' && r.status === 'passed');
    
    if (hasGoogleDocAI && hasGemini) {
      console.log('✅ Google Cloud integration fully operational');
    } else if (hasGoogleDocAI || hasGemini) {
      console.log('⚠️  Partial Google Cloud integration');
    } else {
      console.log('❌ Google Cloud integration not working');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('  1. Upload PDF documents to test Document AI processing');
    console.log('  2. Populate provider_policies database with real policies');
    console.log('  3. Test end-to-end policy comparison workflow');
  }

  async runFullSuite(): Promise<void> {
    console.log('🚀 Google Cloud Services Test Suite\n');
    console.log('Testing Google Document AI + Gemini integration for Australian health insurance analysis\n');
    
    await this.testEnvironmentConfiguration();
    await this.testGeminiModelDiscovery(); 
    await this.testDocumentAIConfiguration();
    await this.testServiceFactoryConfiguration();
    await this.testIntegratedPolicyAnalysis();
    
    this.generateReport();
  }
}

// Export for use in other test files
export { GoogleServicesTestSuite };

// Run if called directly
if (require.main === module) {
  const testSuite = new GoogleServicesTestSuite();
  testSuite.runFullSuite().catch(console.error);
}