/**
 * Error Codes and Messages
 * Centralized error management for consistent error handling
 */

export const API_ERRORS = {
  // File Upload Errors
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  NO_FILE_PROVIDED: 'NO_FILE_PROVIDED',
  
  // Processing Errors
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DOCUMENT_EXTRACTION_FAILED: 'DOCUMENT_EXTRACTION_FAILED',
  PII_DETECTION_FAILED: 'PII_DETECTION_FAILED',
  COMPARISON_ENGINE_ERROR: 'COMPARISON_ENGINE_ERROR',
  
  // Session Errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_ALREADY_COMPLETED: 'SESSION_ALREADY_COMPLETED',
  INVALID_SESSION_ID: 'INVALID_SESSION_ID',
  
  // Service Errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Database Errors
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_SAVE_FAILED: 'DATA_SAVE_FAILED',
  
  // Privacy and Security Errors
  PII_STORAGE_FAILED: 'PII_STORAGE_FAILED',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  
  // Email Service Errors
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  INVALID_EMAIL_ADDRESS: 'INVALID_EMAIL_ADDRESS',
  EMAIL_TEMPLATE_ERROR: 'EMAIL_TEMPLATE_ERROR',
  
  // Validation Errors
  INVALID_REQUEST_FORMAT: 'INVALID_REQUEST_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_PARAMETER: 'INVALID_PARAMETER'
} as const;

export const ERROR_MESSAGES = {
  // File Upload Error Messages
  [API_ERRORS.INVALID_FILE_TYPE]: 'Please upload a valid PDF file. Other file types are not supported.',
  [API_ERRORS.FILE_TOO_LARGE]: 'File size exceeds the maximum limit of 10MB. Please upload a smaller file.',
  [API_ERRORS.FILE_CORRUPTED]: 'The uploaded file appears to be corrupted. Please try uploading again.',
  [API_ERRORS.NO_FILE_PROVIDED]: 'Please select a policy document to upload.',
  
  // Processing Error Messages
  [API_ERRORS.PROCESSING_FAILED]: 'Unable to process your policy. Please check the document and try again.',
  [API_ERRORS.AI_SERVICE_ERROR]: 'Our AI analysis service is temporarily unavailable. Please try again later.',
  [API_ERRORS.DOCUMENT_EXTRACTION_FAILED]: 'Unable to extract text from your document. Please ensure it\'s a readable PDF.',
  [API_ERRORS.PII_DETECTION_FAILED]: 'Error occurred while protecting your personal information. Please try again.',
  [API_ERRORS.COMPARISON_ENGINE_ERROR]: 'Unable to complete policy comparison. Please try again later.',
  
  // Session Error Messages
  [API_ERRORS.SESSION_NOT_FOUND]: 'Analysis session not found. Please start a new analysis.',
  [API_ERRORS.SESSION_EXPIRED]: 'Your analysis session has expired. Please upload your document again.',
  [API_ERRORS.SESSION_ALREADY_COMPLETED]: 'This analysis has already been completed. Results are available.',
  [API_ERRORS.INVALID_SESSION_ID]: 'Invalid session identifier. Please start a new analysis.',
  
  // Service Error Messages
  [API_ERRORS.SERVICE_UNAVAILABLE]: 'Our analysis service is temporarily unavailable. Please try again in a few minutes.',
  [API_ERRORS.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment before trying again.',
  [API_ERRORS.AUTHENTICATION_FAILED]: 'Authentication failed. Please refresh the page and try again.',
  [API_ERRORS.QUOTA_EXCEEDED]: 'Daily analysis limit reached. Please try again tomorrow.',
  
  // Database Error Messages
  [API_ERRORS.DATABASE_CONNECTION_ERROR]: 'Database connection error. Please try again later.',
  [API_ERRORS.DATA_NOT_FOUND]: 'Requested data not found. Please verify your request.',
  [API_ERRORS.DATA_SAVE_FAILED]: 'Failed to save analysis results. Please try again.',
  
  // Privacy and Security Error Messages
  [API_ERRORS.PII_STORAGE_FAILED]: 'Failed to securely store personal information. Please try again.',
  [API_ERRORS.ENCRYPTION_FAILED]: 'Failed to encrypt sensitive data. Please try again.',
  [API_ERRORS.DECRYPTION_FAILED]: 'Failed to decrypt data. The session may have expired.',
  [API_ERRORS.CONSENT_REQUIRED]: 'Additional consent required to access this feature.',
  [API_ERRORS.UNAUTHORIZED_ACCESS]: 'Unauthorized access attempt. Please verify your session.',
  
  // Email Service Error Messages
  [API_ERRORS.EMAIL_DELIVERY_FAILED]: 'Failed to send results via email. Please check your email address.',
  [API_ERRORS.INVALID_EMAIL_ADDRESS]: 'Please provide a valid email address.',
  [API_ERRORS.EMAIL_TEMPLATE_ERROR]: 'Error generating email content. Please try again.',
  
  // Validation Error Messages
  [API_ERRORS.INVALID_REQUEST_FORMAT]: 'Invalid request format. Please check your input.',
  [API_ERRORS.MISSING_REQUIRED_FIELD]: 'Required field is missing. Please complete all fields.',
  [API_ERRORS.INVALID_PARAMETER]: 'Invalid parameter provided. Please check your input.'
} as const;

export const ERROR_CATEGORIES = {
  CLIENT_ERROR: 'client_error',       // 400-499 status codes
  SERVER_ERROR: 'server_error',       // 500-599 status codes
  VALIDATION_ERROR: 'validation_error', // Input validation failures
  PROCESSING_ERROR: 'processing_error', // Analysis pipeline failures
  SECURITY_ERROR: 'security_error',   // Privacy/security related errors
  SERVICE_ERROR: 'service_error'      // External service failures
} as const;

export const ERROR_RECOVERY_SUGGESTIONS = {
  [API_ERRORS.INVALID_FILE_TYPE]: [
    'Ensure your file is in PDF format',
    'Convert your document to PDF if necessary',
    'Contact support if you need help with file conversion'
  ],
  
  [API_ERRORS.FILE_TOO_LARGE]: [
    'Compress your PDF file to reduce size',
    'Remove unnecessary pages if possible',
    'Split large documents into smaller sections'
  ],
  
  [API_ERRORS.PROCESSING_FAILED]: [
    'Verify your document is clearly readable',
    'Try uploading the document again',
    'Contact support if the issue persists'
  ],
  
  [API_ERRORS.SERVICE_UNAVAILABLE]: [
    'Wait a few minutes and try again',
    'Check our status page for service updates',
    'Contact support if the service remains unavailable'
  ],
  
  [API_ERRORS.SESSION_EXPIRED]: [
    'Upload your document again to start a new analysis',
    'Ensure you complete the analysis within the time limit',
    'Contact support if you need assistance'
  ]
} as const;

// Helper function to get user-friendly error message
export function getUserFriendlyError(errorCode: keyof typeof ERROR_MESSAGES): string {
  return ERROR_MESSAGES[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Helper function to get error recovery suggestions
export function getRecoverySuggestions(errorCode: keyof typeof ERROR_RECOVERY_SUGGESTIONS): readonly string[] {
  return ERROR_RECOVERY_SUGGESTIONS[errorCode] || [
    'Try the operation again',
    'Refresh the page and retry',
    'Contact support if the problem continues'
  ] as const;
}

// Helper function to determine error category
export function getErrorCategory(errorCode: string): string {
  if (errorCode.includes('FILE') || errorCode.includes('INVALID_REQUEST')) {
    return ERROR_CATEGORIES.CLIENT_ERROR;
  }
  if (errorCode.includes('SERVICE') || errorCode.includes('DATABASE')) {
    return ERROR_CATEGORIES.SERVER_ERROR;
  }
  if (errorCode.includes('VALIDATION')) {
    return ERROR_CATEGORIES.VALIDATION_ERROR;
  }
  if (errorCode.includes('PROCESSING') || errorCode.includes('AI_SERVICE')) {
    return ERROR_CATEGORIES.PROCESSING_ERROR;
  }
  if (errorCode.includes('PII') || errorCode.includes('CONSENT') || errorCode.includes('UNAUTHORIZED')) {
    return ERROR_CATEGORIES.SECURITY_ERROR;
  }
  return ERROR_CATEGORIES.SERVICE_ERROR;
}