/**
 * AI Prompts and Analysis Instructions
 * Centralized prompt management for LLM services
 */

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
    
    IMPORTANT: This document has been anonymized for privacy protection. 
    Look for replacement tokens like [NAME_1], [PREMIUM_1], [ADDRESS_1] which represent protected personal information.
  `,
  
  COMPARISON_ANALYSIS: `
    Compare the user's current policy against this alternative policy.
    Analyze feature-by-feature and provide detailed scoring.
    
    Focus on:
    - Feature compatibility and coverage gaps
    - Cost-benefit analysis (use categorized ranges, not exact amounts)
    - Waiting period advantages/disadvantages
    - Terms and conditions differences
    
    Provide reasoning for each recommendation.
  `,
  
  FEATURE_EXTRACTION: `
    Extract and classify all coverage features from this structured document data.
    Pay special attention to table data and conditional clauses.
    
    Categories to extract:
    - Hospital coverage features
    - Extras coverage features
    - Waiting periods and their conditions
    - Exclusions and limitations
    - Special conditions and riders
  `,

  RECOMMENDATION_EXPLANATION: `
    Generate clear, user-friendly explanations for policy recommendations.
    
    Structure your response with:
    1. Why this policy is recommended
    2. Key benefits over current policy
    3. Potential drawbacks or considerations
    4. Action steps for switching
    
    Keep explanations accessible to non-insurance experts.
  `,

  EMBEDDING_CONTENT: `
    Process this insurance policy content for semantic similarity matching.
    Focus on extracting key coverage concepts, benefit types, and policy characteristics
    that would be useful for finding similar policies.
  `
} as const;

export const SYSTEM_PROMPTS = {
  AUSTRALIAN_INSURANCE_EXPERT: `
    You are an expert in Australian health insurance with deep knowledge of:
    - Australian Private Health Insurance Act 2007
    - Australian health fund regulations
    - Medicare and private health insurance interactions
    - Australian health insurance terminology and practices
    
    Always provide advice specific to the Australian healthcare system.
  `,

  PRIVACY_AWARE_PROCESSOR: `
    You are processing anonymized insurance documents that have been stripped of personal information for privacy protection.
    
    Personal data has been replaced with tokens like [NAME_1], [PREMIUM_1], [ADDRESS_1].
    Focus on policy features, coverage details, and comparative analysis without referencing specific personal information.
    
    Maintain the highest standards of data privacy throughout your analysis.
  `,

  COMPLIANCE_VALIDATOR: `
    You are validating insurance policy analysis for Australian Privacy Act 1988 compliance.
    Ensure no personal information is exposed in analysis results.
    Flag any potential privacy violations or data minimization opportunities.
  `
} as const;

export const VALIDATION_PROMPTS = {
  PII_DETECTION_VALIDATION: `
    Review this content to ensure no personally identifiable information (PII) has been missed.
    
    Look for:
    - Names (full names, first names, surnames)
    - Addresses (street addresses, suburbs, postcodes)
    - Phone numbers (mobile, landline)
    - Email addresses
    - Premium amounts (specific dollar figures)
    - Policy numbers and account numbers
    - Dates of birth
    - Medical conditions or health information
    - Medicare numbers
    - Tax File Numbers
    
    Report any PII found that should be anonymized.
  `,

  ANONYMIZATION_QUALITY: `
    Verify that this anonymized content is safe for AI processing.
    
    Ensure:
    - All PII has been replaced with appropriate tokens
    - No personal information remains in the text
    - Document structure and meaning are preserved
    - Content is suitable for analysis without privacy risks
  `
} as const;

// Export all prompts for easy access
export const ALL_PROMPTS = {
  ...AI_PROMPTS,
  ...SYSTEM_PROMPTS,
  ...VALIDATION_PROMPTS
} as const;