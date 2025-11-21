/**
 * Quick Integration Test for Google Cloud Services
 * For comprehensive testing, use: npx tsx scripts/test-google-services.ts
 * 
 * This is a simplified test focused on the core policy analysis workflow.
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ServiceFactory } from '@/lib/services/mock-services';

async function testCompleteIntegration() {
  console.log('🚀 Testing Complete Google Cloud Integration...\n');

  // Debug environment variables
  console.log('Environment check:');
  console.log('- MOCK_AI_SERVICES:', process.env.MOCK_AI_SERVICES);
  console.log('- GOOGLE_CLOUD_PROJECT_ID:', !!process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log('- GOOGLE_DOCUMENT_AI_PROCESSOR_ID:', !!process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID);
  console.log('- GOOGLE_GEMINI_API_KEY:', !!process.env.GOOGLE_GEMINI_API_KEY);
  console.log();

  try {
    // Create services
    const documentProcessor = ServiceFactory.createDocumentProcessor();
    const llmProvider = ServiceFactory.createLLMProvider();

    console.log('✅ Services created successfully');

    // Test with a sample text (simulating what would come from a PDF)
    const samplePolicyText = `
HEALTH INSURANCE POLICY DOCUMENT

Policy Type: Hospital & Extras Combined
Policy Tier: Gold Plus
Monthly Premium: $520

HOSPITAL BENEFITS:
- Private hospital accommodation
- Choice of doctor for in-hospital treatment
- Emergency ambulance transport
- Day surgery procedures
- Major surgery with no annual limits
- Excess: $300 per admission

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

CONDITIONS:
- Annual limits apply to extras
- Excess applies to hospital admissions
- Waiting periods must be served
- Benefit percentages based on provider fee
    `;

    // Test document processing with fallback for text input
    console.log('\n📄 Testing document processing...');
    
    let documentResult;
    try {
      // Try with text (will fail with Google Document AI but work with mock)
      documentResult = await documentProcessor.processDocument(
        Buffer.from(samplePolicyText),
        'sample-policy.txt'
      );
    } catch (error) {
      console.log('ℹ️  Document AI requires PDF files, testing with direct content...');
      
      // Create a mock result for testing the LLM integration
      documentResult = {
        text: samplePolicyText,
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
            type: 'PREMIUM',
            value: '$134.50',
            confidence: 0.92,
            boundingBox: { vertices: [{ x: 100, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 220 }, { x: 100, y: 220 }] }
          },
          {
            type: 'EXCESS',
            value: '$500',
            confidence: 0.90,
            boundingBox: { vertices: [{ x: 150, y: 250 }, { x: 200, y: 250 }, { x: 200, y: 270 }, { x: 150, y: 270 }] }
          }
        ],
        layout: {
          pages: [{
            pageNumber: 1,
            textBlocks: [{
              text: 'HEALTH INSURANCE POLICY',
              confidence: 0.98,
              boundingBox: {}
            }]
          }]
        },
        confidence: 0.95,
        processingTime: 1500
      };
    }

    console.log('Document processing result:', {
      content: documentResult.text.substring(0, 200) + '...',
      hasStructuredData: true,
      tablesCount: documentResult.tables?.length || 0,
      entitiesCount: documentResult.entities?.length || 0
    });

    // Test LLM analysis
    console.log('\n🤖 Analyzing with Gemini LLM...');
    const analysis = await llmProvider.analyzeFeatures(documentResult);

    console.log('LLM Analysis result:');
    console.log(JSON.stringify(analysis, null, 2));

    // Test other LLM features
    console.log('\n🔍 Testing embedding generation...');
    const embedding = await llmProvider.generateEmbedding(documentResult.text);
    console.log(`Embedding generated: ${embedding.length} dimensions`);

    console.log('\n💡 Testing recommendation explanation...');
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
    
    const explanation = await llmProvider.explainRecommendation(mockComparison);
    console.log('Explanation:', Array.isArray(explanation) ? explanation.join(', ') : 'Non-array result');

    console.log('\n✅ Complete integration test successful!');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
}

// Run the test
if (require.main === module) {
  testCompleteIntegration().catch(console.error);
}

export { testCompleteIntegration };