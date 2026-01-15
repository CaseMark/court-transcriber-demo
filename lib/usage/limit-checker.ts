/**
 * Limit Checker
 *
 * Checks if demo usage limits have been exceeded.
 */

import type { UsageCheckResult, UsageWarningLevel, DemoUsage } from './types';
import { getUsageLimits, getSessionDurationMs } from './config';
import { getOrCreateUsage } from './usage-storage';

/**
 * Check if usage limits allow another operation
 */
export function checkUsageLimits(usage?: DemoUsage): UsageCheckResult {
  const currentUsage = usage || getOrCreateUsage();
  const limits = getUsageLimits();

  const sessionStartTime = new Date(currentUsage.sessionStartedAt).getTime();
  const sessionDurationMs = getSessionDurationMs(limits.sessionHours);
  const sessionEndTime = sessionStartTime + sessionDurationMs;
  const now = Date.now();

  // Calculate time usage
  const timeElapsedMs = now - sessionStartTime;
  const timeRemainingMs = Math.max(0, sessionEndTime - now);
  const percentTimeUsed = Math.min(100, (timeElapsedMs / sessionDurationMs) * 100);

  // Calculate cost usage
  const costRemainingUsd = Math.max(0, limits.priceLimitUsd - currentUsage.estimatedCostUsd);
  const percentCostUsed = Math.min(100, (currentUsage.estimatedCostUsd / limits.priceLimitUsd) * 100);

  // Check if time exceeded
  if (timeRemainingMs <= 0) {
    return {
      isAllowed: false,
      reason: 'time_exceeded',
      timeRemainingMs: 0,
      costRemainingUsd,
      percentTimeUsed: 100,
      percentCostUsed,
    };
  }

  // Check if cost exceeded
  if (costRemainingUsd <= 0) {
    return {
      isAllowed: false,
      reason: 'cost_exceeded',
      timeRemainingMs,
      costRemainingUsd: 0,
      percentTimeUsed,
      percentCostUsed: 100,
    };
  }

  return {
    isAllowed: true,
    timeRemainingMs,
    costRemainingUsd,
    percentTimeUsed,
    percentCostUsed,
  };
}

/**
 * Get the warning level based on usage percentages
 */
export function getWarningLevel(checkResult: UsageCheckResult): UsageWarningLevel {
  const { percentTimeUsed, percentCostUsed, isAllowed } = checkResult;

  if (!isAllowed) {
    return 'exceeded';
  }

  const maxPercent = Math.max(percentTimeUsed, percentCostUsed);

  if (maxPercent >= 90) {
    return 'near';
  }

  if (maxPercent >= 75) {
    return 'approaching';
  }

  return 'none';
}

/**
 * Check if the current operation would exceed limits
 * @param additionalCostUsd - Estimated cost of the operation
 */
export function wouldExceedLimits(additionalCostUsd: number): UsageCheckResult {
  const usage = getOrCreateUsage();
  const limits = getUsageLimits();

  // Simulate adding the cost
  const simulatedUsage: DemoUsage = {
    ...usage,
    estimatedCostUsd: usage.estimatedCostUsd + additionalCostUsd,
  };

  return checkUsageLimits(simulatedUsage);
}

/**
 * Get a human-readable description of the limit that was exceeded
 */
export function getLimitExceededMessage(reason: 'time_exceeded' | 'cost_exceeded'): string {
  const limits = getUsageLimits();

  if (reason === 'time_exceeded') {
    return `Your ${limits.sessionHours}-hour demo session has expired.`;
  }

  return `You've reached the $${limits.priceLimitUsd.toFixed(2)} usage limit for this demo.`;
}
