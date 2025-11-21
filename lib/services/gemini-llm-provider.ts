// Real Google Gemini LLM implementation
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, StructuredDocumentData } from './interfaces';
import { PolicyFeatures, ComparisonResult } from '@/lib/types';
import { AI_PROMPTS, SYSTEM_PROMPTS } from '@/lib/constants/prompts';

interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export class GeminiLLMProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;
  private config: GeminiConfig;

  constructor(config?: GeminiConfig) {
    // Use environment variables as defaults
    this.config = {
      apiKey: config?.apiKey || process.env.GOOGLE_GEMINI_API_KEY || '',
      model: config?.model || 'gemini-pro-latest'
    };

    console.log('🤖 Initializing Gemini LLM with config:', {
      model: this.config.model,
      apiKeyConfigured: !!this.config.apiKey
    });

    // Validate required configuration
    if (!this.config.apiKey) {
      throw new Error('Gemini API key missing. Please check GOOGLE_GEMINI_API_KEY environment variable.');
    }

    // Initialize the Gemini client
    this.client = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.config.model || 'gemini-pro-latest';
    
    console.log('✅ Gemini LLM client initialized');
  }

  async analyzeFeatures(input: string | StructuredDocumentData): Promise<PolicyFeatures> {
    try {
      console.log('🧠 Analyzing policy features with Gemini...');
      
      // Extract content from either string or StructuredDocumentData
      let content: string;
      let tableData = '';
      let entityData = '';
      
      if (typeof input === 'string') {
        content = input;
        console.log(`📊 Content length: ${content.length} characters`);
      } else {
        // Handle StructuredDocumentData from Google Document AI
        content = input.text || '';
        console.log(`📊 Content length: ${content.length} characters`);
        
        if (input.tables && input.tables.length > 0) {
          console.log(`📊 Tables found: ${input.tables.length}`);
        }
        if (input.entities && input.entities.length > 0) {
          console.log(`📊 Entities found: ${input.entities.length}`);
        }
          
        // Include table data for better analysis
        if (input.tables && input.tables.length > 0) {
          tableData = input.tables.map(table => {
            const headers = table.headers.join(' | ');
            const rows = table.rows.map(row => row.join(' | ')).join('\n');
            return `Table:\n${headers}\n${rows}`;
          }).join('\n\n');
        }
        
        // Include entity data for better analysis
        if (input.entities && input.entities.length > 0) {
          entityData = input.entities.map(entity => 
              `${entity.type}: ${entity.value} (confidence: ${entity.confidence})`
            ).join('\n');
        }
      }

      const model = this.client.getGenerativeModel({ model: this.model });

      // Create a comprehensive prompt for Australian health insurance analysis
      const prompt = this.createAnalysisPrompt(content, tableData, entityData);

      console.log('🚀 Sending request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('✅ Gemini analysis completed');
      console.log(`📝 Response length: ${text.length} characters`);

      // Parse the JSON response
      let policyFeatures: PolicyFeatures;
      try {
        // Clean the response - remove markdown code blocks if present
        const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
        policyFeatures = JSON.parse(cleanedText);
        
        console.log('✅ Successfully parsed Gemini response');
        console.log('📋 Analysis summary:', {
          policyType: policyFeatures.policyType,
          policyTier: policyFeatures.policyTier,
          hospitalFeatures: policyFeatures.hospitalFeatures?.length || 0,
          extrasFeatures: policyFeatures.extrasFeatures?.length || 0,
          exclusions: policyFeatures.exclusions?.length || 0
        });

      } catch (parseError) {
        console.error('❌ Failed to parse Gemini response as JSON:', parseError);
        console.log('Raw response:', text.substring(0, 500) + '...');
        
        // Fallback: try to extract basic information using regex
        policyFeatures = this.extractFallbackFeatures(content);
        console.log('⚠️ Using fallback feature extraction');
      }

      return policyFeatures;

    } catch (error) {
      console.error('❌ Gemini analysis failed:', error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Gemini API key. Please check your GOOGLE_GEMINI_API_KEY.');
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Gemini API quota exceeded. Please check your usage limits.');
        } else if (error.message.includes('SAFETY')) {
          throw new Error('Content flagged by Gemini safety filters. Try uploading a different document.');
        }
      }
      
      // Fallback to basic analysis if AI fails
      console.log('⚠️ Falling back to basic pattern analysis...');
      const content = typeof input === 'string' ? input : input.text;
      return this.extractFallbackFeatures(content);
    }
  }

  async generateEmbedding(content: string): Promise<number[]> {
    try {
      console.log('🔗 Generating embedding with Gemini...');
      
      const model = this.client.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(content);
      
      const embedding = result.embedding.values || [];
      console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
      
      return embedding;
      
    } catch (error) {
      console.warn('⚠️ Embedding generation failed, using random fallback:', error);
      
      // Fallback: generate deterministic "embedding" based on content hash
      const hash = this.simpleHash(content);
      return Array.from({ length: 384 }, (_, i) => 
        Math.sin(hash + i) * 0.5 + Math.cos(hash * 2 + i) * 0.5
      );
    }
  }

  async explainRecommendation(comparison: ComparisonResult): Promise<string[]> {
    try {
      console.log('💭 Generating recommendation explanation with Gemini...');
      
      const model = this.client.getGenerativeModel({ model: this.model });
      
      const prompt = `${SYSTEM_PROMPTS.AUSTRALIAN_INSURANCE_EXPERT}

${AI_PROMPTS.GEMINI_RECOMMENDATION_EXPLANATION}

Policy: ${comparison.policy.providerName} - ${comparison.policy.policyName}
Overall Score: ${(comparison.overallScore * 100).toFixed(1)}%
Feature Match: ${(comparison.featureMatchScore * 100).toFixed(1)}%
Cost Efficiency: ${(comparison.costEfficiencyScore * 100).toFixed(1)}%
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
        const reasons = JSON.parse(cleanedText);
        
        if (Array.isArray(reasons)) {
          console.log(`✅ Generated ${reasons.length} explanation reasons`);
          return reasons;
        }
      } catch (parseError) {
        console.warn('Failed to parse explanation response:', parseError);
      }
      
      // Fallback to existing reasons
      return comparison.reasoning || [
        'Good match for your current coverage needs',
        'Competitive pricing for similar benefits',
        'Reputable provider with strong customer service'
      ];
      
    } catch (error) {
      console.warn('⚠️ Explanation generation failed:', error);
      return comparison.reasoning || ['Recommended based on coverage analysis'];
    }
  }

  private createAnalysisPrompt(content: string, tableData?: string, entityData?: string): string {
    const basePrompt = `${SYSTEM_PROMPTS.AUSTRALIAN_INSURANCE_EXPERT}

${AI_PROMPTS.GEMINI_JSON_ANALYSIS}

Policy Document:
${content.substring(0, 8000)} ${content.length > 8000 ? '...[truncated]' : ''}`;

    const tableSection = tableData ? `

EXTRACTED TABLES:
${tableData}` : '';

    const entitySection = entityData ? `

EXTRACTED ENTITIES:
${entityData}` : '';

    return basePrompt + tableSection + entitySection;
  }

  private extractFallbackFeatures(content: string): PolicyFeatures {
    console.log('🔍 Performing fallback feature extraction...');
    
    if (!content || typeof content !== 'string') {
      console.warn('⚠️ No content provided for fallback analysis');
      return this.getDefaultFeatures();
    }
    
    const text = content.toLowerCase();
    
    // Determine policy type
    let policyType: 'hospital' | 'extras' | 'combined' = 'combined';
    if (text.includes('hospital only') || (!text.includes('dental') && !text.includes('optical'))) {
      policyType = 'hospital';
    } else if (text.includes('extras only') || (!text.includes('hospital') && !text.includes('admission'))) {
      policyType = 'extras';
    }
    
    // Determine policy tier
    let policyTier: 'basic' | 'bronze' | 'silver' | 'gold' = 'silver';
    if (text.includes('gold') || text.includes('premium') || text.includes('comprehensive')) {
      policyTier = 'gold';
    } else if (text.includes('bronze') || text.includes('basic')) {
      policyTier = 'bronze';
    } else if (text.includes('basic')) {
      policyTier = 'basic';
    }
    
    // Extract premium category
    let premiumCategory: 'under-200' | '200-400' | '400-600' | 'over-600' = '400-600';
    const premiumMatch = text.match(/\$?(\d+)[\s]*(?:per month|\/month|monthly)/);
    if (premiumMatch) {
      const amount = parseInt(premiumMatch[1]);
      if (amount < 200) premiumCategory = 'under-200';
      else if (amount < 400) premiumCategory = '200-400';
      else if (amount < 600) premiumCategory = '400-600';
      else premiumCategory = 'over-600';
    }
    
    // Extract excess category
    let excessCategory: 'none' | 'under-500' | '500-1000' | 'over-1000' = 'under-500';
    const excessMatch = text.match(/excess[\s]*:?\s*\$?(\d+)/);
    if (excessMatch) {
      const amount = parseInt(excessMatch[1]);
      if (amount === 0) excessCategory = 'none';
      else if (amount < 500) excessCategory = 'under-500';
      else if (amount < 1000) excessCategory = '500-1000';
      else excessCategory = 'over-1000';
    }
    
    // Extract features using keyword matching
    const hospitalFeatures: string[] = [];
    const hospitalKeywords = {
      'private_hospital': ['private hospital', 'private room'],
      'choice_of_doctor': ['choice of doctor', 'doctor choice'],
      'emergency_ambulance': ['ambulance', 'emergency transport'],
      'day_surgery': ['day surgery', 'day procedures'],
      'accommodation': ['accommodation', 'overnight stay']
    };
    
    Object.entries(hospitalKeywords).forEach(([feature, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        hospitalFeatures.push(feature);
      }
    });
    
    const extrasFeatures: string[] = [];
    const extrasKeywords = {
      'general_dental': ['general dental', 'dental check', 'dental clean'],
      'major_dental': ['major dental', 'dental surgery', 'dental work'],
      'optical': ['optical', 'glasses', 'contact lens'],
      'physiotherapy': ['physiotherapy', 'physio'],
      'psychology': ['psychology', 'mental health', 'counselling']
    };
    
    Object.entries(extrasKeywords).forEach(([feature, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        extrasFeatures.push(feature);
      }
    });
    
    return {
      policyType,
      policyTier,
      premiumCategory,
      excessCategory,
      hospitalFeatures,
      extrasFeatures,
      waitingPeriods: {
        'hospital_services': '12 months',
        'extras_services': '2 months'
      },
      exclusions: ['cosmetic_surgery'],
      conditions: ['excess_applies']
    };
  }

  private getDefaultFeatures(): PolicyFeatures {
    return {
      policyType: 'combined',
      policyTier: 'silver',
      premiumCategory: '200-400',
      excessCategory: 'under-500',
      hospitalFeatures: ['private_hospital'],
      extrasFeatures: ['general_dental'],
      waitingPeriods: { 'hospital_services': '12 months' },
      exclusions: ['cosmetic_surgery'],
      conditions: ['excess_applies']
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Export factory function for easy integration
export function createGeminiLLMProvider(): GeminiLLMProvider {
  return new GeminiLLMProvider();
}