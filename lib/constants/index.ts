/**
 * Constants Index
 * Central export for all application constants
 */

export * from './prompts';
export * from './messages';
export * from './errors';
export * from './config';
export * from './ui';

// Re-export commonly used constants for convenience
export {
  AI_PROMPTS,
  SYSTEM_PROMPTS,
  VALIDATION_PROMPTS
} from './prompts';

export {
  PROCESSING_MESSAGES,
  EMAIL_MESSAGES,
  NOTIFICATION_MESSAGES,
  UI_MESSAGES,
  STATUS_MESSAGES
} from './messages';

export {
  API_ERRORS,
  ERROR_MESSAGES,
  getUserFriendlyError,
  getRecoverySuggestions,
  getErrorCategory
} from './errors';

export {
  PROCESSING_CONFIG,
  SESSION_CONFIG,
  PRIVACY_CONFIG,
  PROVIDER_CONFIG,
  API_CONFIG,
  FEATURE_FLAGS
} from './config';

export {
  UI_CONSTANTS,
  DELIVERY_OPTIONS,
  TOP_N_OPTIONS,
  PROGRESS_STAGES_UI,
  PRIVACY_CONTROLS_UI
} from './ui';