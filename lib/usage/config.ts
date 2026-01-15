/**
 * Demo Usage Configuration
 *
 * Loads demo limits from environment variables.
 */

import type { UsageLimits } from './types';

// Voice API pricing: $0.30 per minute
export const VOICE_API_PRICE_PER_MINUTE = 0.30;
export const VOICE_API_PRICE_PER_SECOND = VOICE_API_PRICE_PER_MINUTE / 60;

// Default limits
const DEFAULT_SESSION_HOURS = 24;
const DEFAULT_PRICE_LIMIT_USD = 5;

/**
 * Get usage limits from environment variables
 */
export function getUsageLimits(): UsageLimits {
  const sessionHours = parseFloat(
    process.env.NEXT_PUBLIC_DEMO_SESSION_HOURS ||
    process.env.DEMO_SESSION_HOURS ||
    String(DEFAULT_SESSION_HOURS)
  );

  const priceLimitUsd = parseFloat(
    process.env.NEXT_PUBLIC_DEMO_SESSION_PRICE_LIMIT ||
    process.env.DEMO_SESSION_PRICE_LIMIT ||
    String(DEFAULT_PRICE_LIMIT_USD)
  );

  return {
    sessionHours: isNaN(sessionHours) ? DEFAULT_SESSION_HOURS : sessionHours,
    priceLimitUsd: isNaN(priceLimitUsd) ? DEFAULT_PRICE_LIMIT_USD : priceLimitUsd,
  };
}

/**
 * Calculate max audio minutes allowed based on price limit
 */
export function getMaxAudioMinutes(priceLimitUsd: number): number {
  return priceLimitUsd / VOICE_API_PRICE_PER_MINUTE;
}

/**
 * Calculate session duration in milliseconds
 */
export function getSessionDurationMs(sessionHours: number): number {
  return sessionHours * 60 * 60 * 1000;
}
