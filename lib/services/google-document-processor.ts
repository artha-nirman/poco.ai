// Real Google Cloud Document AI implementation
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { DocumentProcessor } from './interfaces';

interface GoogleDocumentConfig {
  projectId: string;
  location: string;
  processorId: string;
  credentialsPath?: string;
}

interface StructuredDocumentData {
  text: string;
  tables: TableData[];
  entities: ExtractedEntity[];
  layout: DocumentLayout;
  confidence: number;
  processingTime: number;
}

interface TableData {
  headers: string[];
  rows: string[][];
  confidence: number;
  pageNumber: number;
}

interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  boundingBox: {
    vertices: { x: number; y: number }[];
  };
}

interface DocumentLayout {
  pages: {
    pageNumber: number;
    textBlocks: {
      text: string;
      confidence: number;
      boundingBox: any;
    }[];
  }[];
}

export class GoogleDocumentProcessor implements DocumentProcessor {
  private client: DocumentProcessorServiceClient;
  private processorPath: string;
  private config: GoogleDocumentConfig;

  // Supported file types for Document AI
  private readonly SUPPORTED_MIME_TYPES = {
    'application/pdf': 'PDF',
    'image/png': 'PNG Image',
    'image/jpeg': 'JPEG Image',
    'image/jpg': 'JPG Image',
    'image/gif': 'GIF Image',
    'image/bmp': 'BMP Image',
    'image/tiff': 'TIFF Image',
    'image/webp': 'WebP Image'
  } as const;

  constructor(config?: GoogleDocumentConfig) {
    // Use environment variables as defaults
    this.config = {
      projectId: config?.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || '',
      location: config?.location || process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us',
      processorId: config?.processorId || process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || '',
      credentialsPath: config?.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS
    };

    console.log('🔧 Initializing Google Document AI with config:', {
      projectId: this.config.projectId,
      location: this.config.location,
      processorId: this.config.processorId.substring(0, 8) + '...',
      credentialsConfigured: !!this.config.credentialsPath
    });

    // Validate required configuration
    if (!this.config.projectId || !this.config.processorId) {
      throw new Error('Google Cloud Document AI configuration missing. Please check GOOGLE_CLOUD_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID environment variables.');
    }

    // Initialize the Document AI client
    const clientConfig: any = {};
    
    if (this.config.credentialsPath) {
      clientConfig.keyFilename = this.config.credentialsPath;
    }
    
    this.client = new DocumentProcessorServiceClient(clientConfig);

    // Build the processor resource path
    this.processorPath = `projects/${this.config.projectId}/locations/${this.config.location}/processors/${this.config.processorId}`;
    
    console.log('✅ Google Document AI client initialized');
    console.log('📄 Processor path:', this.processorPath);
  }

  async processDocument(buffer: Buffer, filename?: string): Promise<StructuredDocumentData> {
    const startTime = Date.now();
    
    try {
      console.log('📄 Processing document with Google Document AI...');
      console.log(`📊 Document size: ${(buffer.length / 1024).toFixed(1)} KB`);

      // Detect file type
      const mimeType = this.detectMimeType(buffer, filename);
      const supportedTypeName = this.SUPPORTED_MIME_TYPES[mimeType as keyof typeof this.SUPPORTED_MIME_TYPES];
      console.log(`📄 Detected file type: ${supportedTypeName || mimeType}`);

      // Check if file type is supported
      if (!Object.keys(this.SUPPORTED_MIME_TYPES).includes(mimeType)) {
        throw new Error(`Unsupported file format. Please upload one of: ${Object.values(this.SUPPORTED_MIME_TYPES).join(', ')}. For text documents, please convert to PDF first.`);
      }

      // Call Google Document AI API
      const request = {
        name: this.processorPath,
        rawDocument: {
          content: buffer,
          mimeType: mimeType
        },
        // Enable all features for comprehensive processing
        processOptions: {
          ocrConfig: {
            enableImageQualityScores: true,
            enableSymbol: true,
          }
        }
      };

      console.log('🚀 Sending request to Document AI...');
      const [result] = await this.client.processDocument(request);
      const processingTime = Date.now() - startTime;

      console.log('✅ Document AI processing completed');
      console.log(`⏱️ Processing time: ${processingTime}ms`);
      
      if (!result.document) {
        throw new Error('No document returned from Document AI');
      }

      // Extract structured data from Document AI response
      const structuredData = await this.extractStructuredData(result.document, processingTime);
      
      console.log('📋 Extraction summary:', {
        textLength: structuredData.text.length,
        tablesFound: structuredData.tables.length,
        entitiesFound: structuredData.entities.length,
        confidence: structuredData.confidence,
        processingTimeMs: structuredData.processingTime
      });

      return structuredData;

    } catch (error) {
      console.error('❌ Google Document AI processing failed:', error);
      
      // Provide helpful error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('Unsupported file format')) {
          // Our custom error message - pass it through
          throw error;
        } else if (error.message.includes('Unsupported input file format')) {
          throw new Error('Invalid file format. Please upload a PDF document or a supported image format (PNG, JPEG, etc.). Text files must be converted to PDF first.');
        } else if (error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Document processing service unavailable. Please try again later or contact support.');
        } else if (error.message.includes('NOT_FOUND')) {
          throw new Error('Document processing service configuration error. Please contact support.');
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Service temporarily unavailable due to high usage. Please try again in a few minutes.');
        }
      }
      
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try uploading a PDF file.`);
    }
  }

  private async extractStructuredData(document: any, processingTime: number): Promise<StructuredDocumentData> {
    const text = document.text || '';
    
    // Extract tables with enhanced processing for insurance documents
    const tables = this.extractTables(document.pages || []);
    
    // Extract entities (amounts, dates, policy numbers, etc.)
    const entities = this.extractEntities(document.entities || []);
    
    // Build layout information
    const layout = this.extractLayout(document.pages || []);
    
    // Calculate overall confidence score
    const confidence = this.calculateConfidence(document, tables, entities);

    return {
      text,
      tables,
      entities,
      layout,
      confidence,
      processingTime
    };
  }

  private extractTables(pages: any[]): TableData[] {
    const tables: TableData[] = [];
    
    pages.forEach((page, pageIndex) => {
      const pageTables = page.tables || [];
      
      pageTables.forEach((table: any) => {
        try {
          // Extract headers from first row
          const headers: string[] = [];
          const rows: string[][] = [];
          
          if (table.headerRows && table.headerRows.length > 0) {
            const headerRow = table.headerRows[0];
            headers.push(...this.extractRowText(headerRow.cells || []));
          }
          
          // Extract data rows
          if (table.bodyRows) {
            table.bodyRows.forEach((bodyRow: any) => {
              const rowData = this.extractRowText(bodyRow.cells || []);
              if (rowData.length > 0) {
                rows.push(rowData);
              }
            });
          }
          
          // Only add tables that have meaningful content
          if (headers.length > 0 || rows.length > 0) {
            tables.push({
              headers,
              rows,
              confidence: this.getTableConfidence(table),
              pageNumber: pageIndex + 1
            });
          }
          
        } catch (error) {
          console.warn('Error extracting table:', error);
        }
      });
    });
    
    console.log(`📊 Extracted ${tables.length} tables from document`);
    return tables;
  }

  private extractRowText(cells: any[]): string[] {
    return cells.map(cell => {
      if (cell.layout && cell.layout.textAnchor && cell.layout.textAnchor.textSegments) {
        return cell.layout.textAnchor.textSegments
          .map((segment: any) => segment.text || '')
          .join(' ')
          .trim();
      }
      return '';
    }).filter(text => text.length > 0);
  }

  private getTableConfidence(table: any): number {
    // Calculate average confidence from table detection
    if (table.layout && table.layout.confidence) {
      return table.layout.confidence;
    }
    return 0.8; // Default confidence for tables
  }

  private extractEntities(entities: any[]): ExtractedEntity[] {
    return entities.map(entity => {
      const type = entity.type || 'unknown';
      const mentionText = entity.mentionText || '';
      const confidence = entity.confidence || 0;
      
      // Extract bounding box for entity location
      let boundingBox = { vertices: [] };
      if (entity.pageAnchor && entity.pageAnchor.pageRefs && entity.pageAnchor.pageRefs[0]) {
        const pageRef = entity.pageAnchor.pageRefs[0];
        if (pageRef.boundingPoly && pageRef.boundingPoly.vertices) {
          boundingBox = {
            vertices: pageRef.boundingPoly.vertices.map((vertex: any) => ({
              x: vertex.x || 0,
              y: vertex.y || 0
            }))
          };
        }
      }

      return {
        type,
        value: mentionText,
        confidence,
        boundingBox
      };
    }).filter(entity => entity.value.length > 0);
  }

  private extractLayout(pages: any[]): DocumentLayout {
    const layoutPages = pages.map((page, index) => {
      const textBlocks = (page.blocks || []).map((block: any) => {
        const text = this.extractBlockText(block);
        const confidence = block.layout?.confidence || 0;
        const boundingBox = block.layout?.boundingPoly || {};
        
        return {
          text,
          confidence,
          boundingBox
        };
      }).filter((block: any) => block.text.trim().length > 0);

      return {
        pageNumber: index + 1,
        textBlocks
      };
    });

    return { pages: layoutPages };
  }

  private extractBlockText(block: any): string {
    if (block.layout && block.layout.textAnchor && block.layout.textAnchor.textSegments) {
      return block.layout.textAnchor.textSegments
        .map((segment: any) => segment.text || '')
        .join(' ')
        .trim();
    }
    return '';
  }

  private calculateConfidence(document: any, tables: TableData[], entities: ExtractedEntity[]): number {
    // Calculate overall confidence based on multiple factors
    let totalConfidence = 0;
    let factors = 0;

    // Document-level confidence
    if (document.pages && document.pages.length > 0) {
      const pageConfidences = document.pages
        .map((page: any) => page.layout?.confidence || 0.8)
        .filter((conf: number) => conf > 0);
      
      if (pageConfidences.length > 0) {
        totalConfidence += pageConfidences.reduce((sum: number, conf: number) => sum + conf, 0) / pageConfidences.length;
        factors++;
      }
    }

    // Table extraction confidence
    if (tables.length > 0) {
      const tableConfidences = tables.map(table => table.confidence);
      totalConfidence += tableConfidences.reduce((sum, conf) => sum + conf, 0) / tableConfidences.length;
      factors++;
    }

    // Entity extraction confidence
    if (entities.length > 0) {
      const entityConfidences = entities.map(entity => entity.confidence);
      totalConfidence += entityConfidences.reduce((sum, conf) => sum + conf, 0) / entityConfidences.length;
      factors++;
    }

    // Return average confidence, with fallback
    return factors > 0 ? totalConfidence / factors : 0.85;
  }

  private detectMimeType(buffer: Buffer, filename?: string): string {
    // Check magic bytes for common file types
    const bytes = buffer.slice(0, 12);
    
    // PDF signature
    if (bytes.slice(0, 4).toString('ascii') === '%PDF') {
      return 'application/pdf';
    }
    
    // PNG signature
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }
    
    // JPEG signature
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    // GIF signature
    if (bytes.slice(0, 3).toString('ascii') === 'GIF') {
      return 'image/gif';
    }
    
    // BMP signature
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
      return 'image/bmp';
    }
    
    // TIFF signatures
    if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) ||
        (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A)) {
      return 'image/tiff';
    }
    
    // WebP signature
    if (bytes.slice(0, 4).toString('ascii') === 'RIFF' && 
        bytes.slice(8, 12).toString('ascii') === 'WEBP') {
      return 'image/webp';
    }
    
    // Check for common text file patterns (not supported by Document AI)
    const textStart = bytes.slice(0, 100).toString('utf-8', 0, Math.min(buffer.length, 100));
    if (this.isLikelyTextFile(textStart, filename)) {
      return 'text/plain'; // This will be rejected with helpful message
    }
    
    // Fallback to filename extension if provided
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        case 'bmp': return 'image/bmp';
        case 'tiff':
        case 'tif': return 'image/tiff';
        case 'webp': return 'image/webp';
        case 'txt':
        case 'doc':
        case 'docx': return 'text/plain'; // Will be rejected
      }
    }
    
    // Default to unsupported if we can't detect
    return 'application/octet-stream';
  }

  private isLikelyTextFile(sample: string, filename?: string): boolean {
    // Check if content appears to be readable text
    const textPattern = /^[\x20-\x7E\s\r\n\t]*$/; // Printable ASCII + whitespace
    const isAsciiText = textPattern.test(sample);
    
    // Check for insurance-related keywords that suggest it's a policy document
    const insuranceKeywords = ['policy', 'premium', 'coverage', 'deductible', 'benefit', 'claim'];
    const hasInsuranceContent = insuranceKeywords.some(keyword => 
      sample.toLowerCase().includes(keyword)
    );
    
    // Check filename for text extensions
    const textExtensions = ['.txt', '.doc', '.docx', '.rtf'];
    const hasTextExtension = filename ? textExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    ) : false;
    
    return isAsciiText && (hasInsuranceContent || hasTextExtension);
  }

  // Helper method to test connection
  async testConnection(): Promise<boolean> {
    try {
      // Create a simple test with minimal data
      const testBuffer = Buffer.from('Test document', 'utf-8');
      
      console.log('🧪 Testing Google Document AI connection...');
      
      // Just verify we can call the API (this will fail but should give us auth info)
      await this.client.processDocument({
        name: this.processorPath,
        rawDocument: {
          content: testBuffer,
          mimeType: 'text/plain'
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

// Export factory function for easy integration
export function createGoogleDocumentProcessor(): GoogleDocumentProcessor {
  return new GoogleDocumentProcessor();
}