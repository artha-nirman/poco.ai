/**
 * PII Detection Service
 * Implements comprehensive PII detection and anonymization for insurance documents
 * Compliant with Australian Privacy Act 1988
 */

export enum PIIType {
  FULL_NAME = 'full_name',
  ADDRESS = 'address',
  PHONE = 'phone',
  EMAIL = 'email',
  PREMIUM_AMOUNT = 'premium_amount',
  POLICY_NUMBER = 'policy_number',
  DATE_OF_BIRTH = 'date_of_birth',
  MEDICAL_CONDITION = 'medical_condition',
  BANK_ACCOUNT = 'bank_account',
  MEDICARE_NUMBER = 'medicare_number',
  TAX_FILE_NUMBER = 'tax_file_number'
}

export interface PIIItem {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  replacementToken: string;
}

export interface PIIDetectionResult {
  detectedPII: PIIItem[];
  anonymizedContent: string;
  confidence: number;
}

export interface PIIDetector {
  detectPII(content: string): Promise<PIIDetectionResult>;
}

/**
 * Pattern-based PII detection with Australian-specific patterns
 */
class PatternBasedDetector {
  private patterns = {
    // Australian phone numbers
    phone: [
      /\b(?:\+61|0)[2-9]\d{8}\b/g,
      /\b04\d{8}\b/g,
      /\b\(\d{2}\)\s?\d{4}\s?\d{4}\b/g
    ],
    
    // Email addresses
    email: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ],
    
    // Australian addresses
    address: [
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Parade|Pde|Highway|Hwy)\b/gi,
      /\b(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}\b/g
    ],
    
    // Premium amounts
    premium: [
      /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:per\s*)?(?:month|monthly|week|weekly|year|yearly|annual|annually)?/gi,
      /\b\d{1,3}(?:,\d{3})*\s*dollars?\s*(?:per\s*)?(?:month|monthly|week|weekly|year|yearly|annual|annually)?/gi
    ],
    
    // Policy numbers
    policyNumber: [
      /\b(?:POL|POLICY|POL#|POLICY#)\s*:?\s*[A-Z0-9]{6,20}\b/gi,
      /\b[A-Z]{2,4}\d{6,12}\b/g,
      /\bMBR\s*:?\s*\d{8,12}\b/gi
    ],
    
    // Date of birth patterns
    dateOfBirth: [
      /\b(?:DOB|Date of Birth)\s*:?\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/gi,
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g
    ],
    
    // Medicare numbers
    medicare: [
      /\b\d{4}\s?\d{4}\s?\d{2}\s?\d{1}\b/g,
      /\bMedicare\s*:?\s*\d{4}\s?\d{4}\s?\d{2}\s?\d{1}\b/gi
    ],
    
    // Tax File Numbers
    tfn: [
      /\bTFN\s*:?\s*\d{3}\s?\d{3}\s?\d{3}\b/gi,
      /\bTax File Number\s*:?\s*\d{3}\s?\d{3}\s?\d{3}\b/gi
    ],
    
    // Bank account numbers
    bankAccount: [
      /\bBSB\s*:?\s*\d{3}-?\d{3}\b/gi,
      /\bAccount\s*:?\s*\d{6,10}\b/gi
    ],
    
    // Names (basic patterns - would be enhanced with ML)
    name: [
      /\b(?:Mr|Mrs|Ms|Dr|Prof)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g
    ]
  };

  detectPatterns(content: string): PIIItem[] {
    const detected: PIIItem[] = [];
    let tokenCounter = 1;

    // Detect each pattern type
    Object.entries(this.patterns).forEach(([patternType, regexArray]) => {
      regexArray.forEach(regex => {
        let match;
        const globalRegex = new RegExp(regex.source, regex.flags);
        
        while ((match = globalRegex.exec(content)) !== null) {
          const piiType = this.mapPatternTypeToPIIType(patternType);
          const replacementToken = `[${piiType.toUpperCase()}_${tokenCounter++}]`;
          
          detected.push({
            type: piiType,
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: this.calculatePatternConfidence(patternType, match[0]),
            replacementToken
          });
        }
      });
    });

    return this.deduplicateAndSort(detected);
  }

  private mapPatternTypeToPIIType(patternType: string): PIIType {
    const mapping: Record<string, PIIType> = {
      phone: PIIType.PHONE,
      email: PIIType.EMAIL,
      address: PIIType.ADDRESS,
      premium: PIIType.PREMIUM_AMOUNT,
      policyNumber: PIIType.POLICY_NUMBER,
      dateOfBirth: PIIType.DATE_OF_BIRTH,
      medicare: PIIType.MEDICARE_NUMBER,
      tfn: PIIType.TAX_FILE_NUMBER,
      bankAccount: PIIType.BANK_ACCOUNT,
      name: PIIType.FULL_NAME
    };
    
    return mapping[patternType] || PIIType.FULL_NAME;
  }

  private calculatePatternConfidence(patternType: string, value: string): number {
    // Basic confidence scoring - would be enhanced with ML
    const confidenceMap: Record<string, number> = {
      email: 0.95,
      phone: 0.90,
      medicare: 0.95,
      tfn: 0.95,
      policyNumber: 0.85,
      premium: 0.80,
      dateOfBirth: 0.75,
      address: 0.70,
      bankAccount: 0.85,
      name: 0.60 // Lower confidence for name patterns
    };

    return confidenceMap[patternType] || 0.50;
  }

  private deduplicateAndSort(items: PIIItem[]): PIIItem[] {
    // Remove overlapping detections, keeping higher confidence ones
    const sorted = items.sort((a, b) => b.confidence - a.confidence);
    const filtered: PIIItem[] = [];

    sorted.forEach(item => {
      const hasOverlap = filtered.some(existing => 
        this.hasOverlap(item, existing)
      );
      
      if (!hasOverlap) {
        filtered.push(item);
      }
    });

    return filtered.sort((a, b) => a.startIndex - b.startIndex);
  }

  private hasOverlap(item1: PIIItem, item2: PIIItem): boolean {
    return !(item1.endIndex <= item2.startIndex || item2.endIndex <= item1.startIndex);
  }
}

/**
 * Main PII Detection Service
 */
export class PIIDetectionService implements PIIDetector {
  private patternDetector: PatternBasedDetector;

  constructor() {
    this.patternDetector = new PatternBasedDetector();
  }

  async detectPII(content: string): Promise<PIIDetectionResult> {
    try {
      // Pattern-based detection
      const detectedPII = this.patternDetector.detectPatterns(content);
      
      // Create anonymized content
      const anonymizedContent = this.anonymizeContent(content, detectedPII);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(detectedPII);

      return {
        detectedPII,
        anonymizedContent,
        confidence
      };
    } catch (error) {
      console.error('PII detection failed:', error);
      throw new Error('PII detection service error');
    }
  }

  private anonymizeContent(content: string, piiItems: PIIItem[]): string {
    // Sort by start index in descending order to avoid index shifting
    const sortedItems = [...piiItems].sort((a, b) => b.startIndex - a.startIndex);
    
    let anonymized = content;
    
    sortedItems.forEach(item => {
      anonymized = 
        anonymized.slice(0, item.startIndex) + 
        item.replacementToken + 
        anonymized.slice(item.endIndex);
    });

    return anonymized;
  }

  private calculateOverallConfidence(piiItems: PIIItem[]): number {
    if (piiItems.length === 0) return 1.0;
    
    const avgConfidence = piiItems.reduce((sum, item) => sum + item.confidence, 0) / piiItems.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Validate PII detection quality for audit purposes
   */
  async validateDetection(content: string, result: PIIDetectionResult): Promise<boolean> {
    // Basic validation - ensure no obvious PII leaked through
    const suspiciousPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b04\d{8}\b/g, // Mobile phone
      /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g // Dollar amounts
    ];

    const hasLeakedPII = suspiciousPatterns.some(pattern => 
      pattern.test(result.anonymizedContent)
    );

    return !hasLeakedPII;
  }
}

/**
 * Factory for creating PII detector instances
 */
export class PIIDetectorFactory {
  static create(): PIIDetector {
    return new PIIDetectionService();
  }
}