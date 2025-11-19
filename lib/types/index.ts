// Core data types for Poco.ai platform

export interface SessionData {
  sessionId: string;
  channel: 'web' | 'email';
  status: 'created' | 'processing' | 'completed' | 'failed' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface ProgressState {
  sessionId: string;
  stage: string;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}

export interface PolicyDocument {
  id: string;
  sessionId: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  uploadedAt: Date;
}

export interface PolicyFeatures {
  policyType: 'hospital' | 'extras' | 'combined';
  policyTier: 'basic' | 'bronze' | 'silver' | 'gold';
  premiumCategory: 'under-200' | '200-400' | '400-600' | 'over-600';
  excessCategory: 'none' | 'under-500' | '500-1000' | 'over-1000';
  hospitalFeatures: string[];
  extrasFeatures: string[];
  waitingPeriods: Record<string, string>;
  exclusions: string[];
  conditions: string[];
}

export interface ProviderPolicy {
  id: string;
  providerCode: string;
  providerName: string;
  policyName: string;
  policyType: 'hospital' | 'extras' | 'combined';
  policyTier: 'basic' | 'bronze' | 'silver' | 'gold';
  premiumRange: {
    single: { min: number; max: number };
    couple: { min: number; max: number };
    family: { min: number; max: number };
  };
  features: PolicyFeatures;
  websiteUrl?: string;
  contactPhone?: string;
}

export interface ComparisonResult {
  policy: ProviderPolicy;
  overallScore: number;
  featureMatchScore: number;
  costEfficiencyScore: number;
  waitingPeriodScore: number;
  confidence: number;
  reasoning: string[];
  coverageImprovements: string[];
  potentialDrawbacks: string[];
}

export interface AnalysisResults {
  sessionId: string;
  userPolicyFeatures: PolicyFeatures;
  recommendations: ComparisonResult[];
  totalPoliciesCompared: number;
  processingTimeMs: number;
  confidence: number;
  generatedAt: Date;
}

// PII and Security Types
export interface PIIData {
  type: 'name' | 'address' | 'phone' | 'email' | 'dob' | 'premium' | 'policy_number' | 'medical_condition';
  value: string;
  confidence: number;
  location: {
    page: number;
    position: { x: number; y: number };
  };
}

export interface EncryptedPIIData {
  sessionId: string;
  encryptedData: Buffer;
  encryptionSalt: Buffer;
  encryptionAlgorithm: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AnonymizedDocument {
  sessionId: string;
  anonymizedContent: string;
  piiTokenMap: Record<string, string>; // [TOKEN_1] -> type
  originalLength: number;
  anonymizedLength: number;
  piiItemsDetected: number;
}