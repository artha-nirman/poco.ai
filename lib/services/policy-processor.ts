// Core Policy Processing Service - Channel-agnostic implementation
import { 
  PolicyProcessor,
  DocumentProcessor,
  LLMProvider,
  PIIProtectionService,
  StorageService,
  NotificationService,
  StructuredDocumentData
} from './interfaces';
import { ServiceFactory } from './mock-services';
import { ProviderPolicyService } from './provider-policy';
import { createV2SessionStore } from '@/lib/database/v2-session-store';
import type { V2SessionStore } from '@/lib/database/v2-session-store';
import type { V2AnalysisRequest } from '@/lib/types/v2/api';
import type { V2SessionProgress } from '@/lib/types/v2';
import { 
  AnalysisResults, 
  ProgressState, 
  PolicyFeatures,
  ComparisonResult,
  ProviderPolicy 
} from '@/lib/types';
import { PROCESSING_MESSAGES, PROCESSING_CONFIG } from '@/lib/constants';

// Shared V2 session store instance
const sharedV2SessionStore = createV2SessionStore();

export class CorePolicyProcessor implements PolicyProcessor {
  private static instance: CorePolicyProcessor;
  private documentProcessor: DocumentProcessor;
  private llmProvider: LLMProvider;
  private piiProtection: PIIProtectionService;
  private storage: StorageService;
  private sessionStore: V2SessionStore;
  private providerPolicyService: ProviderPolicyService;

  constructor() {
    // Use shared V2 session store instance
    this.sessionStore = sharedV2SessionStore;
    // Use service factory to get appropriate implementations
    this.documentProcessor = ServiceFactory.createDocumentProcessor();
    this.llmProvider = ServiceFactory.createLLMProvider();
    this.piiProtection = ServiceFactory.createPIIProtectionService();
    this.storage = ServiceFactory.createStorageService();
    this.providerPolicyService = new ProviderPolicyService();
  }

  static getInstance(): CorePolicyProcessor {
    if (!CorePolicyProcessor.instance) {
      CorePolicyProcessor.instance = new CorePolicyProcessor();
    }
    return CorePolicyProcessor.instance;
  }

  async processPolicy(sessionId: string, fileBuffer: Buffer, filename?: string, skipDocumentAI?: boolean): Promise<AnalysisResults> {
    const startTime = Date.now();
    
    try {
      // Create session in database with default country and request
      await this.sessionStore.createSession(sessionId, 'AU', { 
        policy_text: '', // Will be populated after document processing
        policy_type: 'health',
        user_preferences: {
          privacy_level: 'enhanced',
          analysis_depth: 'comprehensive',
          include_comparison: true,
          highlight_concerns: true
        },
        request_metadata: {
          timestamp: new Date().toISOString(),
          session_id: sessionId
        }
      });
      
      let documentData: StructuredDocumentData;
      
      if (skipDocumentAI || (filename && filename.includes('anonymized_document'))) {
        // Handle text content that has already been processed or is privacy-protected
        console.log('📝 Processing text content (skipping Document AI)...');
        await this.updateProgress(sessionId, 10, 'Processing text content...');
        
        documentData = {
          text: fileBuffer.toString('utf-8'),
          tables: [],
          entities: [],
          layout: { pages: [] },
          confidence: 1.0,
          processingTime: 0
        };
        
        console.log('📄 Text processing completed:', {
          textLength: documentData.text.length,
          source: 'privacy-protected'
        });
      } else {
        // Stage 1: Document Processing with Document AI (15-20 seconds)
        await this.updateProgress(sessionId, 10, PROCESSING_MESSAGES.EXTRACTING_TEXT);
        documentData = await this.documentProcessor.processDocument(fileBuffer, filename);
        
        console.log('📄 Document processing completed:', {
          textLength: documentData.text.length,
          tablesFound: documentData.tables.length,
          entitiesFound: documentData.entities.length,
          confidence: documentData.confidence,
          processingTime: documentData.processingTime + 'ms'
        });
      }
      
      // Stage 2: PII Detection and Isolation (10-15 seconds)
      await this.updateProgress(sessionId, 25, PROCESSING_MESSAGES.DETECTING_PII);
      const piiData = await this.piiProtection.detectPII(documentData.text);
      const { anonymizedDocument, encryptedPII } = await this.piiProtection.isolatePII(
        documentData.text, 
        piiData
      );

      // Stage 3: AI Feature Analysis (30-60 seconds)
      await this.updateProgress(sessionId, 45, PROCESSING_MESSAGES.ANALYZING_FEATURES);
      const policyFeatures = await this.llmProvider.analyzeFeatures(anonymizedDocument.anonymizedContent);
      
      // Stage 4: Vector Embedding Generation (5-10 seconds)
      await this.updateProgress(sessionId, 60, PROCESSING_MESSAGES.GENERATING_EMBEDDINGS);
      const embedding = await this.llmProvider.generateEmbedding(anonymizedDocument.anonymizedContent);

      // Stage 5: Policy Comparison (20-40 seconds)
      await this.updateProgress(sessionId, 75, PROCESSING_MESSAGES.COMPARING_POLICIES);
      const comparisons = await this.compareWithProviderPolicies(policyFeatures, embedding);

      // Stage 6: Recommendation Ranking (5-10 seconds)
      await this.updateProgress(sessionId, 90, PROCESSING_MESSAGES.CALCULATING_SCORES);
      const rankedRecommendations = await this.rankRecommendations(comparisons, policyFeatures);

      // Stage 7: Results Generation (5 seconds)
      await this.updateProgress(sessionId, 100, PROCESSING_MESSAGES.ANALYSIS_COMPLETE);
      
      const results: AnalysisResults = {
        sessionId,
        userPolicyFeatures: policyFeatures,
        recommendations: rankedRecommendations.slice(0, PROCESSING_CONFIG.DEFAULT_TOP_N_RESULTS),
        totalPoliciesCompared: comparisons.length,
        processingTimeMs: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(rankedRecommendations),
        generatedAt: new Date()
      };

      // Convert to V2 format for storage
      const v2Results = {
        session_id: sessionId,
        analysis: results,
        metadata: {
          processing_time_ms: results.processingTimeMs,
          completed_at: results.generatedAt.toISOString(),
          confidence: results.confidence
        }
      };

      // Store results in database
      await this.sessionStore.setSessionResults(sessionId, v2Results);
      
      return results;

    } catch (error) {
      await this.updateProgress(sessionId, -1, `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getProgress(sessionId: string): Promise<ProgressState | null> {
    const v2Progress = await this.sessionStore.getSessionProgress(sessionId);
    if (!v2Progress) return null;
    
    // Convert V2SessionProgress back to ProgressState for compatibility
    return {
      sessionId: v2Progress.session_id,
      stage: v2Progress.current_stage || 'unknown',
      progress: v2Progress.progress_percentage || 0,
      message: v2Progress.stages?.[0]?.error || 'Processing...',
      estimatedTimeRemaining: v2Progress.estimated_completion 
        ? Math.max(0, Math.floor((new Date(v2Progress.estimated_completion).getTime() - Date.now()) / 1000))
        : undefined,
      error: v2Progress.error
    };
  }

  async getResults(sessionId: string): Promise<AnalysisResults | null> {
    const v2Results = await this.sessionStore.getSessionResults(sessionId);
    if (!v2Results) return null;
    
    // Convert V2 format back to AnalysisResults for compatibility
    if (v2Results.analysis) {
      // New V2 format with wrapped analysis
      return v2Results.analysis;
    } else {
      // Handle legacy direct format (if any exists)
      return v2Results as any;
    }
  }

  async createSession(sessionId: string, filename?: string): Promise<void> {
    console.log(`📝 Session ${sessionId} created${filename ? ` for file: ${filename}` : ''}`);
    return await this.sessionStore.createSession(sessionId, 'AU', { 
      policy_text: '', // Will be populated later
      policy_type: 'health',
      user_preferences: {
        privacy_level: 'enhanced',
        analysis_depth: 'comprehensive',
        include_comparison: true,
        highlight_concerns: true
      },
      request_metadata: {
        timestamp: new Date().toISOString(),
        session_id: sessionId
      }
    });
  }

  private async updateProgress(sessionId: string, progress: number, message: string): Promise<void> {
    const progressState: ProgressState = {
      sessionId,
      stage: this.getStageFromProgress(progress),
      progress,
      message,
      estimatedTimeRemaining: this.estimateTimeRemaining(progress)
    };

    // Convert ProgressState to V2SessionProgress format
    const v2Progress = {
      session_id: sessionId,
      status: progress === 100 ? 'completed' as const : progress === -1 ? 'failed' as const : 'processing' as const,
      progress_percentage: progress === -1 ? 0 : progress, // Don't use -1 for database constraint
      current_stage: progressState.stage,
      stages: [{
        name: progressState.stage,
        status: progress === 100 ? 'completed' as const : progress === -1 ? 'failed' as const : 'in_progress' as const,
        started_at: new Date().toISOString(),
        completed_at: progress === 100 ? new Date().toISOString() : undefined,
        error: progress === -1 ? message : undefined
      }],
      estimated_completion: progressState.estimatedTimeRemaining ? new Date(Date.now() + progressState.estimatedTimeRemaining * 1000).toISOString() : null,
      error: progress === -1 ? message : undefined
    };

    // Store progress in database
    await this.sessionStore.updateSessionProgress(sessionId, v2Progress);

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
    try {
      // Get active policies from database for Australia (default)
      const activePolicies = await this.providerPolicyService.getActivePolicies('AU', {
        qualityThreshold: 0.7 // Only get high-quality policies
      });
      
      // Convert ProviderPolicyWithMetadata to ProviderPolicy format
      return activePolicies.map(dbPolicy => ({
        id: dbPolicy.id,
        providerCode: dbPolicy.providerCode,
        providerName: dbPolicy.providerName || dbPolicy.providerCode,
        policyName: dbPolicy.policyName,
        policyType: dbPolicy.policyType as 'hospital' | 'extras' | 'combined',
        policyTier: dbPolicy.policyTier as 'basic' | 'bronze' | 'silver' | 'gold' || 'silver',
        premiumRange: {
          single: dbPolicy.features.premiumRanges.single,
          couple: dbPolicy.features.premiumRanges.couple,
          family: dbPolicy.features.premiumRanges.family
        },
        features: {
          policyType: dbPolicy.policyType as 'hospital' | 'extras' | 'combined',
          policyTier: dbPolicy.policyTier as 'basic' | 'bronze' | 'silver' | 'gold' || 'silver',
          premiumCategory: this.calculatePremiumCategory(dbPolicy.features.premiumRanges.single.min),
          excessCategory: 'under-500' as any, // Default, would come from constraints in real implementation
          hospitalFeatures: this.extractHospitalFeatures(dbPolicy.features.coverageCategories),
          extrasFeatures: this.extractExtrasFeatures(dbPolicy.features.coverageCategories),
          waitingPeriods: this.extractWaitingPeriods(dbPolicy.features.constraints),
          exclusions: this.extractExclusions(dbPolicy.features.constraints),
          conditions: ['standard_terms']
        },
        websiteUrl: dbPolicy.providerName ? `https://www.${dbPolicy.providerCode.toLowerCase()}.com.au` : undefined,
        contactPhone: this.getProviderContactPhone(dbPolicy.providerCode)
      }));
    } catch (error) {
      console.error('Failed to load provider policies from database:', error);
      
      // Fallback to hardcoded data if database is unavailable
      return [
        {
          id: 'fallback_policy_1',
          providerCode: 'MEDIBANK',
          providerName: 'Medibank Private',
          policyName: 'Silver Extra',
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
            conditions: ['standard_terms']
          },
          websiteUrl: 'https://www.medibank.com.au',
          contactPhone: '1300 305 085'
        }
      ];
    }
  }

  // Helper methods for mapping database data to legacy format
  private calculatePremiumCategory(singlePremium: number): 'under-200' | '200-400' | '400-600' | 'over-600' {
    if (singlePremium < 200) return 'under-200';
    if (singlePremium < 400) return '200-400';
    if (singlePremium < 600) return '400-600';
    return 'over-600';
  }

  private extractHospitalFeatures(coverageCategories: any): string[] {
    const hospitalCategory = coverageCategories?.hospital;
    if (!hospitalCategory?.features) return ['private_hospital', 'emergency_ambulance'];
    
    return Object.keys(hospitalCategory.features).filter(feature => 
      hospitalCategory.features[feature]?.covered === true
    );
  }

  private extractExtrasFeatures(coverageCategories: any): string[] {
    const extrasCategory = coverageCategories?.extras;
    if (!extrasCategory?.features) return ['general_dental', 'optical'];
    
    return Object.keys(extrasCategory.features).filter(feature => 
      extrasCategory.features[feature]?.covered === true
    );
  }

  private extractWaitingPeriods(constraints: any[]): Record<string, string> {
    const waitingPeriodConstraints = constraints?.filter(c => c.constraintType === 'waiting_period') || [];
    const periods: Record<string, string> = {};
    
    waitingPeriodConstraints.forEach(constraint => {
      constraint.appliesTo?.forEach((category: string) => {
        periods[category] = constraint.value?.duration || '12 months';
      });
    });
    
    return periods.hospital_services || periods.extras_services 
      ? periods 
      : { hospital_services: '12 months', extras_services: '2 months' };
  }

  private extractExclusions(constraints: any[]): string[] {
    const exclusionConstraints = constraints?.filter(c => c.constraintType === 'exclusion') || [];
    return exclusionConstraints.flatMap(c => c.appliesTo || []);
  }

  private getProviderContactPhone(providerCode: string): string {
    const contacts: Record<string, string> = {
      'MEDIBANK': '1300 305 085',
      'BUPA': '1300 363 892',
      'HCF': '1300 642 642',
      'NIB': '1300 642 642'
    };
    return contacts[providerCode.toUpperCase()] || '1300 000 000';
  }
}