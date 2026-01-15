/**
 * Usage Module
 *
 * Demo usage tracking and limit enforcement.
 */

// Types
export type {
  DemoUsage,
  UsageCheckResult,
  UsageLimits,
  UsageWarningLevel,
} from './types';

// Config
export {
  VOICE_API_PRICE_PER_MINUTE,
  VOICE_API_PRICE_PER_SECOND,
  getUsageLimits,
  getMaxAudioMinutes,
  getSessionDurationMs,
} from './config';

// Cost Calculator
export {
  calculateTranscriptionCost,
  calculateAudioSecondsFromCost,
  formatCost,
  formatDuration,
  formatTimeRemaining,
} from './cost-calculator';

// Storage
export {
  getUsage,
  saveUsage,
  initializeUsage,
  getOrCreateUsage,
  addTranscriptionUsage,
  clearUsage,
  getSessionStartTime,
} from './usage-storage';

// Limit Checker
export {
  checkUsageLimits,
  getWarningLevel,
  wouldExceedLimits,
  getLimitExceededMessage,
} from './limit-checker';

// Context (client-side)
export { UsageProvider, useUsage, useUsageHeader } from './usage-context';
