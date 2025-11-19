# Service Abstraction Layer for Poco.ai

## Overview
Ensure all cloud services and LLM providers are swappable through well-defined interfaces and dependency injection.

## Document Processing Abstraction

```typescript
// Core interface for document processing services
interface DocumentProcessor {
  name: string;
  provider: 'google' | 'azure' | 'aws' | 'local';
  
  processDocument(
    documentBuffer: Buffer,
    options?: DocumentProcessingOptions
  ): Promise<StructuredDocumentData>;
  
  getCapabilities(): DocumentProcessorCapabilities;
  estimateCost(pageCount: number): number;
  isAvailable(): Promise<boolean>;
}

interface DocumentProcessingOptions {
  language?: string;
  enableTableExtraction?: boolean;
  enableOCR?: boolean;
  confidenceThreshold?: number;
}

interface StructuredDocumentData {
  fullText: string;
  pages: DocumentPage[];
  tables: TableData[];
  entities: ExtractedEntity[];
  confidence: number;
  processingTime: number;
}

interface DocumentProcessorCapabilities {
  supportsTableExtraction: boolean;
  supportsOCR: boolean;
  supportsHandwriting: boolean;
  supportsMultiLanguage: boolean;
  maxFileSize: number;
  supportedFormats: string[];
}
```

## LLM Provider Abstraction

```typescript
// Core interface for LLM providers
interface LLMProvider {
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure' | 'local';
  models: string[];
  
  analyzeDocument(
    documentData: StructuredDocumentData | string,
    prompt: string,
    options?: LLMOptions
  ): Promise<LLMResponse>;
  
  getCapabilities(): LLMCapabilities;
  estimateCost(inputTokens: number, outputTokens: number): number;
  isAvailable(): Promise<boolean>;
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  systemPrompt?: string;
}

interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  processingTime: number;
  confidence?: number;
}

interface LLMCapabilities {
  contextWindow: number;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  maxOutputTokens: number;
}
```

## Implementation Classes

```typescript
// Google Cloud Implementation
export class GoogleDocumentProcessor implements DocumentProcessor {
  name = 'Google Document AI';
  provider = 'google' as const;
  
  private client: DocumentProcessorServiceClient;
  private processorId: string;
  
  constructor(config: GoogleDocumentConfig) {
    // Initialize Google Document AI client with provided credentials
    // This handles authentication and sets up the processor endpoint
    this.client = new DocumentProcessorServiceClient(config.credentials);
    this.processorId = config.processorId;
  }
  
  async processDocument(
    documentBuffer: Buffer,
    options?: DocumentProcessingOptions
  ): Promise<StructuredDocumentData> {
    // ARCHITECTURAL DECISION: Using Google Document AI for accurate PDF processing
    // This preserves table structure and handles complex layouts better than PDF-to-text
    // Implementation details...
    
    // TODO: Add comprehensive error handling and retry logic
    // TODO: Add processing time tracking for performance monitoring
    // TODO: Add confidence score validation and fallback triggers
  }
}

export class GeminiLLMProvider implements LLMProvider {
  name = 'Google Gemini';
  provider = 'google' as const;
  models = ['gemini-1.5-pro', 'gemini-1.5-flash'];
  
  private client: GoogleGenerativeAI;
  
  constructor(config: GeminiConfig) {
    // ARCHITECTURAL DECISION: Using Gemini 1.5 Pro for large context window (2M tokens)
    // This allows processing entire insurance policies without chunking
    this.client = new GoogleGenerativeAI(config.apiKey);
  }
  
  async analyzeDocument(
    documentData: StructuredDocumentData | string,
    prompt: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    // IMPLEMENTATION NOTE: This method handles both structured data from Document AI
    // and raw text input for fallback scenarios
    
    // TODO: Add token counting and cost estimation
    // TODO: Implement response validation and retry logic
    // TODO: Add streaming support for real-time progress updates
  }
}

// Azure Implementation
export class AzureDocumentProcessor implements DocumentProcessor {
  name = 'Azure Document Intelligence';
  provider = 'azure' as const;
  
  private client: DocumentAnalysisClient;
  
  constructor(config: AzureDocumentConfig) {
    this.client = new DocumentAnalysisClient(
      config.endpoint,
      new AzureKeyCredential(config.key)
    );
  }
  
  async processDocument(
    documentBuffer: Buffer,
    options?: DocumentProcessingOptions
  ): Promise<StructuredDocumentData> {
    // Implementation details...
  }
}

export class ClaudeLLMProvider implements LLMProvider {
  name = 'Anthropic Claude';
  provider = 'anthropic' as const;
  models = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
  
  private client: Anthropic;
  
  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }
  
  async analyzeDocument(
    documentData: StructuredDocumentData | string,
    prompt: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    // Implementation details...
  }
}
```

## Service Factory and Configuration

```typescript
// Configuration-driven service creation
interface ServiceConfiguration {
  documentProcessor: {
    primary: DocumentProcessorConfig;
    fallback?: DocumentProcessorConfig[];
  };
  llmProvider: {
    primary: LLMProviderConfig;
    fallback?: LLMProviderConfig[];
  };
}

interface DocumentProcessorConfig {
  type: 'google' | 'azure' | 'aws';
  config: Record<string, any>;
  priority: number;
}

interface LLMProviderConfig {
  type: 'openai' | 'anthropic' | 'google' | 'azure';
  model: string;
  config: Record<string, any>;
  priority: number;
}

export class ServiceFactory {
  private config: ServiceConfiguration;
  
  constructor(config: ServiceConfiguration) {
    this.config = config;
  }
  
  createDocumentProcessor(): DocumentProcessor {
    const primaryConfig = this.config.documentProcessor.primary;
    
    switch (primaryConfig.type) {
      case 'google':
        return new GoogleDocumentProcessor(primaryConfig.config);
      case 'azure':
        return new AzureDocumentProcessor(primaryConfig.config);
      default:
        throw new Error(`Unsupported document processor: ${primaryConfig.type}`);
    }
  }
  
  createLLMProvider(): LLMProvider {
    const primaryConfig = this.config.llmProvider.primary;
    
    switch (primaryConfig.type) {
      case 'google':
        return new GeminiLLMProvider(primaryConfig.config);
      case 'anthropic':
        return new ClaudeLLMProvider(primaryConfig.config);
      default:
        throw new Error(`Unsupported LLM provider: ${primaryConfig.type}`);
    }
  }
}
```

## Processing Pipeline with Fallbacks

```typescript
export class PolicyProcessor {
  private documentProcessors: DocumentProcessor[];
  private llmProviders: LLMProvider[];
  
  constructor(
    documentProcessors: DocumentProcessor[],
    llmProviders: LLMProvider[]
  ) {
    // ARCHITECTURAL DECISION: Sort providers by priority for fallback chain
    // Higher priority providers are tried first, with automatic fallback on failure
    this.documentProcessors = documentProcessors.sort((a, b) => b.priority - a.priority);
    this.llmProviders = llmProviders.sort((a, b) => b.priority - a.priority);
  }
  
  async processPolicy(pdfBuffer: Buffer): Promise<PolicyFeatures> {
    // PROCESSING PIPELINE: Two-stage approach for reliability and performance
    // Stage 1: Document processing with structure preservation
    // Stage 2: LLM analysis with business intelligence extraction
    
    const structuredData = await this.processDocumentWithFallbacks(pdfBuffer);
    const policyFeatures = await this.analyzePolicyWithFallbacks(structuredData);
    
    return policyFeatures;
  }
  
  private async processDocumentWithFallbacks(
    pdfBuffer: Buffer
  ): Promise<StructuredDocumentData> {
    // RELIABILITY PATTERN: Try each processor in priority order until one succeeds
    // This ensures system continues working even if primary service fails
    
    for (const processor of this.documentProcessors) {
      try {
        // Check service availability before attempting processing
        if (await processor.isAvailable()) {
          console.log(`Attempting document processing with ${processor.name}`);
          return await processor.processDocument(pdfBuffer);
        }
      } catch (error) {
        // LOG IMPORTANT: Document processing failures for monitoring
        console.warn(`Document processor ${processor.name} failed:`, error);
        // Continue to next processor rather than failing completely
        continue;
      }
    }
    
    // CRITICAL ERROR: All document processors failed - this needs immediate attention
    throw new Error('All document processors failed');
  }
  
  private async analyzePolicyWithFallbacks(
    documentData: StructuredDocumentData
  ): Promise<PolicyFeatures> {
    // BUSINESS LOGIC: Convert structured document data into insurance policy features
    // This is where we apply Australian insurance domain knowledge
    
    for (const llmProvider of this.llmProviders) {
      try {
        if (await llmProvider.isAvailable()) {
          console.log(`Attempting policy analysis with ${llmProvider.name}`);
          
          const response = await llmProvider.analyzeDocument(
            documentData,
            POLICY_ANALYSIS_PROMPT // From constants file
          );
          
          // VALIDATION: Ensure the response is valid JSON and contains expected fields
          const parsedResponse = JSON.parse(response.content);
          // TODO: Add schema validation here to ensure response matches PolicyFeatures interface
          
          return parsedResponse;
        }
      } catch (error) {
        // LOG IMPORTANT: LLM analysis failures for cost and performance monitoring
        console.warn(`LLM provider ${llmProvider.name} failed:`, error);
        continue;
      }
    }
    
    // CRITICAL ERROR: All LLM providers failed - this affects user experience
    throw new Error('All LLM providers failed');
  }
}
```

## Environment-based Configuration

```typescript
// config/services.ts
export const SERVICE_CONFIGS: Record<string, ServiceConfiguration> = {
  development: {
    documentProcessor: {
      primary: {
        type: 'google',
        config: {
          projectId: process.env.GOOGLE_PROJECT_ID,
          processorId: process.env.GOOGLE_PROCESSOR_ID,
          credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!)
        },
        priority: 1
      },
      fallback: [
        {
          type: 'azure',
          config: {
            endpoint: process.env.AZURE_DOC_ENDPOINT,
            key: process.env.AZURE_DOC_KEY
          },
          priority: 2
        }
      ]
    },
    llmProvider: {
      primary: {
        type: 'google',
        model: 'gemini-1.5-pro',
        config: {
          apiKey: process.env.GEMINI_API_KEY
        },
        priority: 1
      },
      fallback: [
        {
          type: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          config: {
            apiKey: process.env.CLAUDE_API_KEY
          },
          priority: 2
        }
      ]
    }
  },
  
  production: {
    // Different configuration for production
    // Can prioritize different providers
  }
};
```

## Usage in API Routes

```typescript
// /api/policies/process
import { ServiceFactory, PolicyProcessor } from '@/lib/services';
import { SERVICE_CONFIGS } from '@/config/services';
import { PROCESSING_MESSAGES } from '@/lib/constants/messages';
import { API_ERRORS } from '@/lib/constants/errors';

export async function POST(request: Request) {
  try {
    const factory = new ServiceFactory(
      SERVICE_CONFIGS[process.env.NODE_ENV || 'development']
    );
    
    const documentProcessor = factory.createDocumentProcessor();
    const llmProvider = factory.createLLMProvider();
    
    const processor = new PolicyProcessor([documentProcessor], [llmProvider]);
    
    // Process the policy
    const formData = await request.formData();
    const file = formData.get('policy') as File;
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const result = await processor.processPolicy(buffer);
    
    return Response.json({
      success: true,
      data: result,
      message: PROCESSING_MESSAGES.ANALYSIS_COMPLETE
    });
    
  } catch (error) {
    console.error('Policy processing failed:', error);
    return Response.json({
      success: false,
      error: API_ERRORS.PROCESSING_FAILED,
      message: PROCESSING_MESSAGES.PROCESSING_ERROR
    }, { status: 500 });
  }
}
```

## Constants Organization

```typescript
// /lib/constants/prompts.ts
export const AI_PROMPTS = {
  POLICY_ANALYSIS: `
    You are an expert Australian health insurance analyst. Analyze this policy document and extract structured information.
    
    FOCUS AREAS:
    1. COVERAGE DETAILS - What's included, excluded, limited
    2. FINANCIAL TERMS - Premiums, excesses, limits, rebates
    3. WAITING PERIODS - All waiting periods and conditions  
    4. CONDITIONS & EXCEPTIONS - When coverage applies/doesn't apply
    5. RIDERS & UPGRADES - Optional add-ons or enhancements
    
    Return structured JSON matching the PolicyFeature interface.
  `,
  
  COMPARISON_ANALYSIS: `
    Compare the user's current policy against this alternative policy.
    Analyze feature-by-feature and provide detailed scoring.
  `,
  
  FEATURE_EXTRACTION: `
    Extract and classify all coverage features from this structured document data.
    Pay special attention to table data and conditional clauses.
  `
} as const;

// /lib/constants/messages.ts
export const PROCESSING_MESSAGES = {
  UPLOAD_STARTED: 'Uploading your policy document...',
  UPLOAD_COMPLETE: 'Upload complete, starting analysis...',
  EXTRACTING_TEXT: 'Extracting text and structure from PDF...',
  ANALYZING_FEATURES: 'Analyzing policy features with AI...',
  FINDING_POLICIES: 'Finding comparable policies in database...',
  COMPARING_POLICIES: 'Comparing against provider policies...',
  CALCULATING_SCORES: 'Calculating scores and rankings...',
  PREPARING_RESULTS: 'Preparing your personalized recommendations...',
  ANALYSIS_COMPLETE: 'Analysis complete! Your recommendations are ready.',
  PROCESSING_ERROR: 'An error occurred while processing your policy. Please try again.'
} as const;

// /lib/constants/errors.ts
export const API_ERRORS = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

export const ERROR_MESSAGES = {
  [API_ERRORS.INVALID_FILE_TYPE]: 'Please upload a valid PDF file.',
  [API_ERRORS.FILE_TOO_LARGE]: 'File size exceeds the maximum limit of 10MB.',
  [API_ERRORS.PROCESSING_FAILED]: 'Unable to process your policy. Please check the document and try again.',
  [API_ERRORS.SERVICE_UNAVAILABLE]: 'Our analysis service is temporarily unavailable. Please try again later.',
  [API_ERRORS.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment before trying again.'
} as const;

// /lib/constants/config.ts
export const PROCESSING_CONFIG = {
  MAX_FILE_SIZE_MB: 10,
  SUPPORTED_FILE_TYPES: ['application/pdf'],
  MAX_PROCESSING_TIME_MS: 180000, // 3 minutes
  SSE_POLL_INTERVAL_MS: 2000,
  DEFAULT_TOP_N_RESULTS: 5,
  MAX_COMPARISON_POLICIES: 30
} as const;

export const UI_CONSTANTS = {
  UPLOAD_BUTTON_TEXT: 'Upload Your Policy',
  PROCESSING_TITLE: 'Analyzing Your Policy',
  RESULTS_TITLE: 'Your Insurance Recommendations',
  COMPARISON_SECTION_TITLE: 'Detailed Feature Comparison'
} as const;

// MOCK DATA SECTION - Replace with real implementation
// TODO: MOCK DATA - These are sample policy providers for development
export const MOCK_PROVIDERS = {
  // TEMPORARY: Sample provider data for initial development
  // Real implementation should fetch from actual provider APIs or database
  providers: [
    {
      id: 'hcf',
      name: 'HCF',
      // MOCK: Real implementation needs actual policy database
      policies: ['Basic Hospital', 'Bronze Plus', 'Silver Extras']
    },
    {
      id: 'medibank', 
      name: 'Medibank',
      // MOCK: Sample policies for testing comparison engine
      policies: ['Bronze Hospital', 'Silver Combined', 'Gold Comprehensive']
    }
  ]
} as const;
```

## Benefits of This Architecture

1. **Easy Provider Switching**: Change configuration to swap providers
2. **Fallback Support**: Automatic failover if primary service fails
3. **Cost Optimization**: Route to cheapest available service
4. **Testing**: Mock implementations for unit tests
5. **Multi-Provider**: Can use different providers for different tasks
6. **Vendor Independence**: No lock-in to specific cloud providers
7. **Constants Management**: All text, prompts, and messages centralized in constants files
8. **Type Safety**: Strongly typed constants with const assertions
9. **Maintainability**: Easy to update messages and prompts without touching logic
10. **Internationalization Ready**: Constants structure supports future i18n