/**
 * UI Text and Labels
 * Centralized UI text management for consistent user experience
 */

export const UI_CONSTANTS = {
  // Page Titles
  UPLOAD_PAGE_TITLE: 'Upload Your Insurance Policy',
  ANALYSIS_PAGE_TITLE: 'Analyzing Your Policy', 
  RESULTS_PAGE_TITLE: 'Your Insurance Recommendations',
  PRIVACY_PAGE_TITLE: 'Privacy & Data Protection',
  COMPARISON_PAGE_TITLE: 'Policy Comparison Results',
  ERROR_PAGE_TITLE: 'Something Went Wrong',
  
  // Navigation Labels
  HOME_NAV: 'Home',
  ABOUT_NAV: 'About',
  PRIVACY_NAV: 'Privacy',
  HELP_NAV: 'Help',
  CONTACT_NAV: 'Contact',
  
  // Button Text
  UPLOAD_BUTTON_TEXT: 'Upload Your Policy',
  START_ANALYSIS_BUTTON: 'Start Analysis',
  VIEW_RESULTS_BUTTON: 'View Results',
  DOWNLOAD_REPORT_BUTTON: 'Download Report',
  TRY_AGAIN_BUTTON: 'Try Again',
  CONTACT_PROVIDER_BUTTON: 'Contact Provider',
  GET_QUOTE_BUTTON: 'Get Quote',
  COMPARE_POLICIES_BUTTON: 'Compare Policies',
  
  // Form Labels
  POLICY_FILE_LABEL: 'Policy Document',
  EMAIL_ADDRESS_LABEL: 'Email Address',
  DELIVERY_PREFERENCE_LABEL: 'How would you like to receive results?',
  PRIVACY_CONSENT_LABEL: 'Privacy Preferences',
  TOP_N_RESULTS_LABEL: 'Number of recommendations',
  
  // Loading States
  UPLOADING_TEXT: 'Uploading...',
  PROCESSING_TEXT: 'Processing...',
  ANALYZING_TEXT: 'Analyzing...',
  LOADING_RESULTS_TEXT: 'Loading results...',
  GENERATING_REPORT_TEXT: 'Generating report...',
  PREPARING_EMAIL_TEXT: 'Preparing email...',
  
  // Help Text
  UPLOAD_HELP: 'Upload a PDF of your current health insurance policy to get personalized recommendations.',
  FILE_SIZE_HELP: 'Files must be under 10MB in PDF format.',
  PROCESSING_HELP: 'This typically takes 2-3 minutes. You can close this page and we\'ll email you when ready.',
  EMAIL_HELP: 'We\'ll send your results to this email address.',
  PRIVACY_HELP: 'Your personal information is automatically protected during analysis.',
  RECOMMENDATIONS_HELP: 'Choose how many policy recommendations you\'d like to see.',
  
  // Validation Messages
  FILE_TOO_LARGE_UI: 'File size exceeds the 10MB limit.',
  INVALID_FILE_TYPE_UI: 'Please upload a PDF file.',
  UPLOAD_REQUIRED_UI: 'Please select a file to upload.',
  EMAIL_REQUIRED_UI: 'Please provide an email address for results delivery.',
  INVALID_EMAIL_UI: 'Please provide a valid email address.',
  
  // Section Headers
  UPLOAD_SECTION: 'Upload Your Policy',
  DELIVERY_SECTION: 'Delivery Options',
  PRIVACY_SECTION: 'Privacy Controls',
  PROGRESS_SECTION: 'Analysis Progress',
  RESULTS_SECTION: 'Your Recommendations',
  COMPARISON_SECTION: 'Policy Comparison',
  DETAILS_SECTION: 'Policy Details',
  
  // Table Headers
  POLICY_NAME_HEADER: 'Policy Name',
  PROVIDER_HEADER: 'Provider',
  PREMIUM_RANGE_HEADER: 'Premium Range',
  COVERAGE_TYPE_HEADER: 'Coverage Type',
  MATCH_SCORE_HEADER: 'Match Score',
  RATING_HEADER: 'Rating',
  ACTIONS_HEADER: 'Actions',
  
  // Status Indicators
  PROCESSING_INDICATOR: 'Processing',
  COMPLETE_INDICATOR: 'Complete',
  ERROR_INDICATOR: 'Error',
  PENDING_INDICATOR: 'Pending',
  CANCELLED_INDICATOR: 'Cancelled',
  
  // Card Labels
  CURRENT_POLICY_CARD: 'Your Current Policy',
  RECOMMENDED_POLICY_CARD: 'Recommended for You',
  ALTERNATIVE_POLICY_CARD: 'Alternative Option',
  BEST_VALUE_CARD: 'Best Value',
  PREMIUM_POLICY_CARD: 'Premium Option',
  
  // Badge Text
  BEST_MATCH_BADGE: 'Best Match',
  SAVINGS_BADGE: 'Potential Savings',
  UPGRADED_BADGE: 'Upgrade',
  SIMILAR_BADGE: 'Similar Coverage',
  POPULAR_BADGE: 'Popular Choice'
} as const;

export const DELIVERY_OPTIONS = {
  WEB_IMMEDIATE: {
    value: 'web',
    label: 'View results immediately on this page',
    description: 'Perfect if you have a few minutes to review results now'
  },
  EMAIL_DELIVERY: {
    value: 'email', 
    label: 'Email me the results',
    description: 'Great for mobile users or if you\'re short on time'
  },
  BOTH_CHANNELS: {
    value: 'both',
    label: 'Both - view now and email a copy',
    description: 'Get immediate results plus an email for your records'
  }
} as const;

export const TOP_N_OPTIONS = [
  { value: 3, label: '3 recommendations' },
  { value: 5, label: '5 recommendations (recommended)' },
  { value: 8, label: '8 recommendations' },
  { value: 10, label: '10 recommendations' }
] as const;

export const PROGRESS_STAGES_UI = {
  document_upload: {
    label: 'Uploading Document',
    icon: '📄',
    description: 'Securely uploading your policy document'
  },
  pii_detection: {
    label: 'Protecting Privacy',
    icon: '🛡️', 
    description: 'Detecting and securing personal information'
  },
  document_extraction: {
    label: 'Reading Document',
    icon: '🔍',
    description: 'Extracting text and structure from PDF'
  },
  ai_analysis: {
    label: 'AI Analysis',
    icon: '🤖',
    description: 'Analyzing policy features with AI'
  },
  policy_comparison: {
    label: 'Comparing Policies',
    icon: '⚖️',
    description: 'Comparing with provider policies'
  },
  recommendation_ranking: {
    label: 'Ranking Options',
    icon: '🏆',
    description: 'Ranking recommendations by fit'
  },
  results_generation: {
    label: 'Preparing Results', 
    icon: '📊',
    description: 'Generating your personalized report'
  },
  completed: {
    label: 'Analysis Complete',
    icon: '✅',
    description: 'Your recommendations are ready!'
  }
} as const;

export const POLICY_FEATURES_UI = {
  // Hospital Coverage
  private_hospital: 'Private Hospital',
  choice_of_doctor: 'Choice of Doctor',
  emergency_ambulance: 'Emergency Ambulance',
  day_surgery: 'Day Surgery',
  accommodation: 'Hospital Accommodation',
  
  // Extras Coverage
  general_dental: 'General Dental',
  major_dental: 'Major Dental',
  optical: 'Optical',
  physiotherapy: 'Physiotherapy', 
  psychology: 'Psychology',
  chiropractic: 'Chiropractic',
  massage: 'Remedial Massage',
  
  // Coverage Tiers
  basic: 'Basic',
  bronze: 'Bronze',
  silver: 'Silver', 
  gold: 'Gold'
} as const;

export const COMPARISON_LABELS = {
  // Comparison Categories
  COVERAGE_MATCH: 'Coverage Match',
  COST_EFFICIENCY: 'Value for Money',
  WAITING_PERIODS: 'Waiting Periods',
  OVERALL_SCORE: 'Overall Score',
  
  // Comparison Results
  BETTER_COVERAGE: 'Better Coverage',
  SAME_COVERAGE: 'Similar Coverage',
  REDUCED_COVERAGE: 'Reduced Coverage',
  COST_SAVINGS: 'Potential Savings',
  COST_INCREASE: 'Cost Increase',
  SHORTER_WAIT: 'Shorter Wait',
  LONGER_WAIT: 'Longer Wait',
  
  // Recommendation Reasoning
  REASONING_INTRO: 'Why we recommend this policy:',
  BENEFITS_INTRO: 'Key benefits:',
  CONSIDERATIONS_INTRO: 'Things to consider:',
  NEXT_STEPS_INTRO: 'Next steps:'
} as const;

export const PRIVACY_CONTROLS_UI = {
  // Privacy Options
  ANONYMOUS_ONLY: {
    label: 'Anonymous analysis only',
    description: 'Maximum privacy - no personal information used'
  },
  BASIC_PERSONALIZATION: {
    label: 'Basic personalization',
    description: 'Use name and premium for tailored recommendations'
  },
  FULL_PERSONALIZATION: {
    label: 'Full personalization', 
    description: 'Use all available information for best recommendations'
  },
  
  // Data Retention Options
  SESSION_ONLY: {
    label: 'Session only',
    description: 'Delete when you close your browser'
  },
  ONE_HOUR: {
    label: '1 hour',
    description: 'Automatically delete after 1 hour'
  },
  TWENTY_FOUR_HOURS: {
    label: '24 hours',
    description: 'Maximum retention (Australian Privacy Act limit)'
  },
  
  // Privacy Features
  PII_PROTECTION_ENABLED: 'Personal information protection is active',
  DATA_MINIMIZATION_ACTIVE: 'Only essential data is being processed',
  ENCRYPTION_ENABLED: 'Your data is encrypted during processing',
  AUTO_DELETION_SCHEDULED: 'Automatic deletion scheduled',
  
  // Consent Messages
  CONSENT_TITLE: 'Privacy Preferences',
  CONSENT_DESCRIPTION: 'Choose how your personal information is used during analysis',
  CONSENT_CONFIRMATION: 'Your privacy preferences have been saved',
  CONSENT_UPDATE_AVAILABLE: 'You can update these preferences at any time'
} as const;

export const FOOTER_CONSTANTS = {
  COPYRIGHT: '© 2025 Poco.ai. All rights reserved.',
  PRIVACY_POLICY_LINK: 'Privacy Policy',
  TERMS_OF_SERVICE_LINK: 'Terms of Service', 
  CONTACT_SUPPORT_LINK: 'Contact Support',
  AUSTRALIAN_PRIVACY_COMPLIANCE: 'Compliant with Australian Privacy Act 1988',
  SECURITY_NOTE: 'Your data is protected with enterprise-grade security'
} as const;