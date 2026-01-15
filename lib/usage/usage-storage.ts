/**
 * Usage Storage
 *
 * localStorage-based storage for demo usage tracking.
 * Following the pattern from local-storage-helpers.ts
 */

import type { DemoUsage } from './types';

const STORAGE_KEY = 'ccc:demoUsage';

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get current usage from localStorage
 */
export function getUsage(): DemoUsage | null {
  if (!isBrowser()) return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as DemoUsage;

    // Validate the stored data has required fields
    if (!parsed.sessionId || !parsed.sessionStartedAt) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[Usage] Failed to load usage:', error);
    return null;
  }
}

/**
 * Save usage to localStorage
 */
export function saveUsage(usage: DemoUsage): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.error('[Usage] Failed to save usage:', error);
  }
}

/**
 * Initialize a new usage session
 */
export function initializeUsage(): DemoUsage {
  const usage: DemoUsage = {
    sessionId: crypto.randomUUID(),
    sessionStartedAt: new Date().toISOString(),
    totalAudioSeconds: 0,
    estimatedCostUsd: 0,
    transcriptionCount: 0,
  };

  saveUsage(usage);
  return usage;
}

/**
 * Get or create usage session
 */
export function getOrCreateUsage(): DemoUsage {
  const existing = getUsage();
  if (existing) return existing;
  return initializeUsage();
}

/**
 * Add transcription usage
 * @param audioSeconds - Duration of audio transcribed in seconds
 * @param costUsd - Cost of the transcription
 */
export function addTranscriptionUsage(audioSeconds: number, costUsd: number): DemoUsage {
  const usage = getOrCreateUsage();

  usage.totalAudioSeconds += audioSeconds;
  usage.estimatedCostUsd += costUsd;
  usage.transcriptionCount += 1;

  saveUsage(usage);
  return usage;
}

/**
 * Clear usage data (reset session)
 */
export function clearUsage(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Usage] Failed to clear usage:', error);
  }
}

/**
 * Get session start time as Date
 */
export function getSessionStartTime(): Date | null {
  const usage = getUsage();
  if (!usage) return null;
  return new Date(usage.sessionStartedAt);
}
