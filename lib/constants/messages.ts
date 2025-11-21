/**
 * User-facing Messages and Notifications
 * Centralized message management for consistent UX
 */

export const PROCESSING_MESSAGES = {
  // Upload Messages
  UPLOAD_STARTED: 'Uploading your policy document...',
  UPLOAD_COMPLETE: 'Upload complete, starting analysis...',
  UPLOAD_VALIDATION: 'Validating document format...',
  
  // Processing Stage Messages
  EXTRACTING_TEXT: 'Extracting text and structure from PDF...',
  ANALYZING_FEATURES: 'Analyzing policy features with AI...',
  DETECTING_PII: 'Detecting and securing personal information...',
  ANONYMIZING_CONTENT: 'Creating privacy-safe analysis version...',
  FINDING_POLICIES: 'Finding comparable policies in database...',
  COMPARING_POLICIES: 'Comparing against provider policies...',
  GENERATING_EMBEDDINGS: 'Creating semantic embeddings for matching...',
  CALCULATING_SCORES: 'Calculating scores and rankings...',
  PREPARING_RESULTS: 'Preparing your personalized recommendations...',
  
  // Completion Messages
  ANALYSIS_COMPLETE: 'Analysis complete! Your recommendations are ready.',
  RESULTS_READY: 'Your insurance comparison results are ready for review.',
  EMAIL_SENT: 'Results have been sent to your email address.',
  
  // Processing Error Messages
  PROCESSING_ERROR: 'An error occurred while processing your policy. Please try again.',
  UPLOAD_ERROR: 'Failed to upload your document. Please check the file and try again.',
  ANALYSIS_ERROR: 'Unable to complete the analysis. Please try uploading again.',
  
  // Privacy and Security Messages
  PII_PROTECTION_ENABLED: 'Your personal information is being protected during analysis...',
  DATA_ANONYMIZED: 'Document has been anonymized for secure AI processing.',
  CONSENT_RECORDED: 'Your privacy preferences have been recorded.',
  DATA_PURGED: 'Your personal data has been securely deleted as requested.'
} as const;

export const EMAIL_MESSAGES = {
  // Email Subject Lines
  ANALYSIS_COMPLETE_SUBJECT: 'Your Health Insurance Analysis is Ready',
  PROGRESS_UPDATE_SUBJECT: 'Insurance Analysis Update',
  ERROR_NOTIFICATION_SUBJECT: 'Issue with Your Insurance Analysis',
  
  // Email Content
  WELCOME_MESSAGE: 'Thank you for using Poco.ai for your health insurance comparison.',
  ANALYSIS_INTRO: 'We\'ve completed the analysis of your current policy and found some great options for you.',
  RESULTS_AVAILABLE: 'Your detailed comparison results are attached and available for review.',
  
  // Email Progress Messages
  EMAIL_PROCESSING_STARTED: 'We\'ve received your policy and started the analysis.',
  EMAIL_HALFWAY_COMPLETE: 'Your analysis is approximately 50% complete.',
  EMAIL_NEARLY_DONE: 'Almost finished - preparing your recommendations.',
  
  // Email Call-to-Actions
  VIEW_RESULTS_CTA: 'View Your Results',
  DOWNLOAD_REPORT_CTA: 'Download Full Report',
  CONTACT_PROVIDER_CTA: 'Contact Recommended Provider',
  
  // Email Footer Messages
  PRIVACY_NOTICE: 'Your data is processed according to our Privacy Policy and Australian Privacy Act 1988.',
  UNSUBSCRIBE_INFO: 'You can unsubscribe from these notifications at any time.',
  SUPPORT_CONTACT: 'Need help? Contact our support team.'
} as const;

export const NOTIFICATION_MESSAGES = {
  // Real-time Notifications
  SESSION_CREATED: 'Analysis session started successfully.',
  PROGRESS_UPDATE: 'Processing update: {stage} - {progress}% complete',
  ESTIMATED_TIME: 'Estimated time remaining: {minutes} minutes',
  
  // Error Notifications
  SESSION_EXPIRED: 'Your analysis session has expired. Please start a new analysis.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.',
  SERVICE_UNAVAILABLE: 'Our analysis service is temporarily unavailable. Please try again later.',
  
  // Success Notifications
  UPLOAD_SUCCESS: 'Document uploaded successfully.',
  ANALYSIS_SUCCESS: 'Analysis completed successfully.',
  EMAIL_DELIVERY_SUCCESS: 'Results delivered to your email.',
  
  // Privacy Notifications
  CONSENT_REQUIRED: 'Additional consent required for personalized features.',
  DATA_RETENTION_NOTICE: 'Your data will be automatically deleted after {hours} hours.',
  ANONYMIZATION_COMPLETE: 'Your document has been successfully anonymized for processing.'
} as const;

export const UI_MESSAGES = {
  // Page Titles
  UPLOAD_PAGE_TITLE: 'Upload Your Insurance Policy',
  ANALYSIS_PAGE_TITLE: 'Analyzing Your Policy',
  RESULTS_PAGE_TITLE: 'Your Insurance Recommendations',
  PRIVACY_PAGE_TITLE: 'Privacy & Data Protection',
  
  // Button Text
  UPLOAD_BUTTON: 'Upload Your Policy',
  START_ANALYSIS_BUTTON: 'Start Analysis',
  VIEW_RESULTS_BUTTON: 'View Results',
  DOWNLOAD_REPORT_BUTTON: 'Download Report',
  TRY_AGAIN_BUTTON: 'Try Again',
  CONTACT_PROVIDER_BUTTON: 'Contact Provider',
  
  // Loading States
  UPLOADING_TEXT: 'Uploading...',
  PROCESSING_TEXT: 'Processing...',
  LOADING_RESULTS_TEXT: 'Loading results...',
  GENERATING_REPORT_TEXT: 'Generating report...',
  
  // Help Text
  UPLOAD_HELP: 'Upload a PDF of your current health insurance policy to get started.',
  FILE_SIZE_HELP: 'Files must be under 10MB in PDF format.',
  PROCESSING_HELP: 'This typically takes 2-3 minutes. You can close this page and we\'ll email you when ready.',
  PRIVACY_HELP: 'Your personal information is automatically protected during analysis.',
  
  // Validation Messages
  FILE_TOO_LARGE: 'File size exceeds the 10MB limit.',
  INVALID_FILE_TYPE: 'Please upload a PDF file.',
  UPLOAD_REQUIRED: 'Please select a file to upload.',
  EMAIL_REQUIRED: 'Please provide an email address for results delivery.',
  INVALID_EMAIL: 'Please provide a valid email address.'
} as const;

export const STATUS_MESSAGES = {
  // Session Status
  SESSION_ACTIVE: 'Session active',
  SESSION_PROCESSING: 'Processing in progress',
  SESSION_COMPLETED: 'Analysis completed',
  SESSION_FAILED: 'Analysis failed',
  SESSION_EXPIRED: 'Session expired',
  
  // Service Status
  SERVICE_OPERATIONAL: 'All systems operational',
  SERVICE_DEGRADED: 'Service experiencing delays',
  SERVICE_DOWN: 'Service temporarily unavailable',
  
  // Progress Status
  STAGE_UPLOAD: 'Document Upload',
  STAGE_EXTRACTION: 'Text Extraction',
  STAGE_PII_DETECTION: 'Privacy Protection',
  STAGE_AI_ANALYSIS: 'AI Analysis',
  STAGE_COMPARISON: 'Policy Comparison',
  STAGE_RANKING: 'Recommendation Ranking',
  STAGE_RESULTS: 'Results Generation'
} as const;