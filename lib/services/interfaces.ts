// Service abstractions for multi-provider architecture
import { 
  PolicyDocument, 
  PolicyFeatures, 
  ProviderPolicy, 
  ComparisonResult, 
  ProgressState,
  PIIData,
  EncryptedPIIData,
  AnonymizedDocument,
  AnalysisResults
} from '@/lib/types';

// Document Processing Service Interface
export interface DocumentProcessor {
  processDocument(buffer: Buffer, filename?: string): Promise<StructuredDocumentData>;
}

// Enhanced interfaces for Google Document AI
export interface StructuredDocumentData {
  text: string;
  tables: TableData[];
  entities: ExtractedEntity[];
  layout: DocumentLayout;
  confidence: number;
  processingTime: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  confidence: number;
  pageNumber: number;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  boundingBox: {
    vertices: { x: number; y: number }[];
  };
}

export interface DocumentLayout {
  pages: {
    pageNumber: number;
    textBlocks: {
      text: string;
      confidence: number;
      boundingBox: any;
    }[];
  }[];
}

// LLM Analysis Service Interface  
export interface LLMProvider {
  analyzeFeatures(content: string | StructuredDocumentData): Promise<PolicyFeatures>;
  generateEmbedding(content: string): Promise<number[]>;
  explainRecommendation(comparison: ComparisonResult): Promise<string[]>;
}

// PII Protection Service Interface
export interface PIIProtectionService {
  detectPII(content: string): Promise<PIIData[]>;
  isolatePII(content: string, piiData: PIIData[]): Promise<{
    encryptedPII: EncryptedPIIData;
    anonymizedDocument: AnonymizedDocument;
    piiKey: string;
  }>;
  personalizeResults(
    results: AnalysisResults, 
    piiKey: string, 
    userConsent: boolean
  ): Promise<AnalysisResults>;
  purgeExpiredPII(): Promise<number>;
}

// Storage Service Interface
export interface StorageService {
  uploadFile(buffer: Buffer, filename: string): Promise<string>; // Returns blob URL
  downloadFile(url: string): Promise<Buffer>;
  deleteFile(url: string): Promise<void>;
}

// Caching Service Interface
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Session Management Service Interface
export interface SessionService {
  createSession(channel: 'web' | 'email'): Promise<string>; // Returns sessionId
  getSession(sessionId: string): Promise<any | null>;
  updateProgress(sessionId: string, progress: ProgressState): Promise<void>;
  completeSession(sessionId: string, results: AnalysisResults): Promise<void>;
  expireSession(sessionId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
}

// Notification Service Interface
export interface NotificationService {
  sendProgress(sessionId: string, progress: ProgressState, channels: string[]): Promise<void>;
  sendCompletion(sessionId: string, results: AnalysisResults, channels: string[]): Promise<void>;
  sendError(sessionId: string, error: Error, channels: string[]): Promise<void>;
}

// Email Service Interface
export interface EmailService {
  sendEmail(to: string, subject: string, htmlContent: string): Promise<void>;
  sendAnalysisResults(to: string, results: AnalysisResults): Promise<void>;
  sendProgressUpdate(to: string, progress: ProgressState): Promise<void>;
}

// Database Service Interface
export interface DatabaseService {
  // Sessions
  createSession(sessionData: any): Promise<string>;
  getSession(sessionId: string): Promise<any | null>;
  updateSession(sessionId: string, updates: any): Promise<void>;
  
  // Policies
  getProviderPolicies(filters?: any): Promise<ProviderPolicy[]>;
  findSimilarPolicies(embedding: number[], limit: number): Promise<ProviderPolicy[]>;
  
  // PII and Compliance
  storePIIData(data: EncryptedPIIData): Promise<void>;
  retrievePIIData(sessionId: string): Promise<EncryptedPIIData | null>;
  auditPIIAccess(sessionId: string, action: string, success: boolean): Promise<void>;
  
  // Results
  storeAnalysisResults(results: AnalysisResults): Promise<void>;
  getAnalysisResults(sessionId: string): Promise<AnalysisResults | null>;
}

// Core Policy Processing Service Interface (Channel-agnostic)
export interface PolicyProcessor {
  processPolicy(sessionId: string, fileBuffer: Buffer): Promise<AnalysisResults>;
  getProgress(sessionId: string): Promise<ProgressState | null>;
  getResults(sessionId: string): Promise<AnalysisResults | null>;
  createSession(sessionId: string): Promise<void>;
}