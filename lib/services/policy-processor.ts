// Core Policy Processing Service - Channel-agnostic implementation
import { 
  PolicyProcessor,
  DocumentProcessor,
  LLMProvider,
  PIIProtectionService,
  StorageService,
  NotificationService
} from './interfaces';
import { ServiceFactory } from './mock-services';
import { createSessionStore, SessionStore } from '@/lib/database/session-store';
import { 
  AnalysisResults, 
  ProgressState, 
  PolicyFeatures,
  ComparisonResult,
  ProviderPolicy 
} from '@/lib/types';

// Shared session store instance
const sharedSessionStore = createSessionStore();

export class CorePolicyProcessor implements PolicyProcessor {
  private static instance: CorePolicyProcessor;
  private documentProcessor: DocumentProcessor;
  private llmProvider: LLMProvider;
  private piiProtection: PIIProtectionService;
  private storage: StorageService;
  private sessionStore: SessionStore;

  constructor() {
    // Use shared session store instance
    this.sessionStore = sharedSessionStore;
    // Use service factory to get appropriate implementations
    this.documentProcessor = ServiceFactory.createDocumentProcessor();
    this.llmProvider = ServiceFactory.createLLMProvider();
    this.piiProtection = ServiceFactory.createPIIProtectionService();
    this.storage = ServiceFactory.createStorageService();
  }

  static getInstance(): CorePolicyProcessor {
    if (!CorePolicyProcessor.instance) {
      CorePolicyProcessor.instance = new CorePolicyProcessor();
    }
    return CorePolicyProcessor.instance;
  }

  async processPolicy(sessionId: string, fileBuffer: Buffer): Promise<AnalysisResults> {
    const startTime = Date.now();
    
    try {
      // Create session in database
      await this.sessionStore.createSession(sessionId);
      
      // Stage 1: Document Processing (15-20 seconds)
      await this.updateProgress(sessionId, 10, 'Processing document structure...');
      const documentData = await this.documentProcessor.processDocument(fileBuffer);
      
      // Stage 2: PII Detection and Isolation (10-15 seconds)
      await this.updateProgress(sessionId, 25, 'Detecting and securing personal information...');
      const piiData = await this.piiProtection.detectPII(documentData.text);
      const { anonymizedDocument, encryptedPII } = await this.piiProtection.isolatePII(
        documentData.text, 
        piiData
      );

      // Stage 3: AI Feature Analysis (30-60 seconds)
      await this.updateProgress(sessionId, 45, 'Analyzing policy features with AI...');
      const policyFeatures = await this.llmProvider.analyzeFeatures(anonymizedDocument.anonymizedContent);
      
      // Stage 4: Vector Embedding Generation (5-10 seconds)
      await this.updateProgress(sessionId, 60, 'Generating semantic embeddings...');
      const embedding = await this.llmProvider.generateEmbedding(anonymizedDocument.anonymizedContent);

      // Stage 5: Policy Comparison (20-40 seconds)
      await this.updateProgress(sessionId, 75, 'Comparing with provider policies...');
      const comparisons = await this.compareWithProviderPolicies(policyFeatures, embedding);

      // Stage 6: Recommendation Ranking (5-10 seconds)
      await this.updateProgress(sessionId, 90, 'Ranking recommendations...');
      const rankedRecommendations = await this.rankRecommendations(comparisons, policyFeatures);

      // Stage 7: Results Generation (5 seconds)
      await this.updateProgress(sessionId, 100, 'Analysis complete!');
      
      const results: AnalysisResults = {
        sessionId,
        userPolicyFeatures: policyFeatures,
        recommendations: rankedRecommendations.slice(0, 5), // Top 5 recommendations
        totalPoliciesCompared: comparisons.length,
        processingTimeMs: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(rankedRecommendations),
        generatedAt: new Date()
      };

      // Store results in database
      await this.sessionStore.setResults(sessionId, results);
      
      return results;

    } catch (error) {
      await this.updateProgress(sessionId, -1, `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getProgress(sessionId: string): Promise<ProgressState | null> {
    return await this.sessionStore.getProgress(sessionId);
  }

  async getResults(sessionId: string): Promise<AnalysisResults | null> {
    return await this.sessionStore.getResults(sessionId);
  }

  async createSession(sessionId: string): Promise<void> {
    return await this.sessionStore.createSession(sessionId);
  }

  private async updateProgress(sessionId: string, progress: number, message: string): Promise<void> {
    const progressState: ProgressState = {
      sessionId,
      stage: this.getStageFromProgress(progress),
      progress,
      message,
      estimatedTimeRemaining: this.estimateTimeRemaining(progress)
    };

    // Store progress in database
    await this.sessionStore.setProgress(sessionId, progressState);

    // TODO: Notify appropriate channels (web SSE, email, etc.)
    console.log(`[${sessionId}] ${progress}% - ${message}`);
  }

  private getStageFromProgress(progress: number): string {
    if (progress <= 10) return 'document_upload';
    if (progress <= 25) return 'pii_protection';
    if (progress <= 45) return 'ai_analysis';
    if (progress <= 60) return 'embedding_generation';
    if (progress <= 75) return 'policy_comparison';
    if (progress <= 90) return 'recommendation_ranking';
    if (progress === 100) return 'completed';
    return 'error';
  }

  private estimateTimeRemaining(progress: number): number {
    // Rough estimates based on processing stages
    if (progress <= 10) return 150; // ~2.5 minutes remaining
    if (progress <= 25) return 120;
    if (progress <= 45) return 90;
    if (progress <= 60) return 60;
    if (progress <= 75) return 30;
    if (progress <= 90) return 10;
    return 0;
  }

  private async compareWithProviderPolicies(
    userFeatures: PolicyFeatures, 
    userEmbedding: number[]
  ): Promise<ComparisonResult[]> {
    // TODO: In real implementation, query database for provider policies
    // For now, use mock provider policies
    
    const mockProviderPolicies = await this.getMockProviderPolicies();
    const comparisons: ComparisonResult[] = [];

    for (const policy of mockProviderPolicies) {
      const comparison = await this.comparePolicies(userFeatures, policy);
      comparisons.push(comparison);
    }

    return comparisons;
  }

  private async comparePolicies(userFeatures: PolicyFeatures, providerPolicy: ProviderPolicy): Promise<ComparisonResult> {
    // Feature matching score
    const featureMatchScore = this.calculateFeatureMatchScore(userFeatures, providerPolicy.features);
    
    // Cost efficiency score (mock calculation)
    const costEfficiencyScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
    
    // Waiting period score
    const waitingPeriodScore = this.calculateWaitingPeriodScore(userFeatures, providerPolicy.features);
    
    // Overall weighted score
    const overallScore = (featureMatchScore * 0.5) + (costEfficiencyScore * 0.3) + (waitingPeriodScore * 0.2);

    return {
      policy: providerPolicy,
      overallScore,
      featureMatchScore,
      costEfficiencyScore,
      waitingPeriodScore,
      confidence: 0.85,
      reasoning: [
        'Similar coverage for hospital services',
        'Competitive premium pricing',
        'Good extras coverage match'
      ],
      coverageImprovements: [
        'Higher dental annual limits',
        'Additional physiotherapy sessions'
      ],
      potentialDrawbacks: [
        'Slightly higher excess',
        'Longer waiting period for pre-existing conditions'
      ]
    };
  }

  private calculateFeatureMatchScore(userFeatures: PolicyFeatures, providerFeatures: PolicyFeatures): number {
    let matchCount = 0;
    let totalFeatures = 0;

    // Compare hospital features
    totalFeatures += userFeatures.hospitalFeatures.length;
    matchCount += userFeatures.hospitalFeatures.filter(feature => 
      providerFeatures.hospitalFeatures.includes(feature)
    ).length;

    // Compare extras features  
    totalFeatures += userFeatures.extrasFeatures.length;
    matchCount += userFeatures.extrasFeatures.filter(feature => 
      providerFeatures.extrasFeatures.includes(feature)
    ).length;

    return totalFeatures > 0 ? matchCount / totalFeatures : 0;
  }

  private calculateWaitingPeriodScore(userFeatures: PolicyFeatures, providerFeatures: PolicyFeatures): number {
    // Simple waiting period comparison - in real implementation, this would be more sophisticated
    return Math.random() * 0.2 + 0.8; // 0.8-1.0 for mock
  }

  private async rankRecommendations(comparisons: ComparisonResult[], userFeatures: PolicyFeatures): Promise<ComparisonResult[]> {
    // Sort by overall score, then by confidence
    return comparisons.sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }
      return b.confidence - a.confidence;
    });
  }

  private calculateOverallConfidence(recommendations: ComparisonResult[]): number {
    if (recommendations.length === 0) return 0;
    
    const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length;
    const topScore = recommendations[0]?.overallScore || 0;
    
    // Overall confidence based on recommendation quality and score
    return Math.min(avgConfidence * (topScore + 0.3), 1.0);
  }

  private async getMockProviderPolicies(): Promise<ProviderPolicy[]> {
    // TODO: Replace with real database query
    return [
      {
        id: 'hcf_silver_plus',
        providerCode: 'HCF',
        providerName: 'HCF Health Insurance',
        policyName: 'Silver Plus',
        policyType: 'combined',
        policyTier: 'silver',
        premiumRange: {
          single: { min: 300, max: 400 },
          couple: { min: 600, max: 800 },
          family: { min: 900, max: 1200 }
        },
        features: {
          policyType: 'combined',
          policyTier: 'silver', 
          premiumCategory: '400-600',
          excessCategory: 'under-500',
          hospitalFeatures: ['private_hospital', 'choice_of_doctor', 'emergency_ambulance'],
          extrasFeatures: ['general_dental', 'optical', 'physiotherapy'],
          waitingPeriods: { hospital_services: '12 months', extras_services: '2 months' },
          exclusions: ['cosmetic_surgery'],
          conditions: ['excess_applies']
        },
        websiteUrl: 'https://www.hcf.com.au',
        contactPhone: '1300 642 642'
      },
      {
        id: 'medibank_silver',
        providerCode: 'MEDIBANK',
        providerName: 'Medibank',
        policyName: 'Silver',
        policyType: 'combined',
        policyTier: 'silver',
        premiumRange: {
          single: { min: 280, max: 380 },
          couple: { min: 560, max: 760 },
          family: { min: 840, max: 1140 }
        },
        features: {
          policyType: 'combined',
          policyTier: 'silver',
          premiumCategory: '200-400', 
          excessCategory: '500-1000',
          hospitalFeatures: ['private_hospital', 'day_surgery', 'emergency_ambulance'],
          extrasFeatures: ['general_dental', 'major_dental', 'optical', 'physiotherapy'],
          waitingPeriods: { hospital_services: '12 months', extras_services: '2 months' },
          exclusions: ['experimental_treatments'],
          conditions: ['annual_limits']
        },
        websiteUrl: 'https://www.medibank.com.au',
        contactPhone: '1300 644 648'
      },
      {
        id: 'bupa_silver_plus',
        providerCode: 'BUPA',
        providerName: 'Bupa Australia',
        policyName: 'Silver Plus',
        policyType: 'combined',
        policyTier: 'silver',
        premiumRange: {
          single: { min: 320, max: 420 },
          couple: { min: 640, max: 840 },
          family: { min: 960, max: 1260 }
        },
        features: {
          policyType: 'combined',
          policyTier: 'silver',
          premiumCategory: '400-600',
          excessCategory: 'under-500',
          hospitalFeatures: ['private_hospital', 'choice_of_doctor', 'accommodation', 'emergency_ambulance'],
          extrasFeatures: ['general_dental', 'major_dental', 'optical', 'physiotherapy', 'psychology'],
          waitingPeriods: { hospital_services: '12 months', extras_services: '2 months' },
          exclusions: ['cosmetic_surgery', 'experimental_treatments'],
          conditions: ['excess_applies', 'session_limits']
        },
        websiteUrl: 'https://www.bupa.com.au',
        contactPhone: '1300 888 299'
      }
    ];
  }
}