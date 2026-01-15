/**
 * Cost Calculator
 *
 * Calculates API costs for Voice API usage.
 */

import { VOICE_API_PRICE_PER_SECOND } from './config';

/**
 * Calculate cost for audio transcription
 * @param audioSeconds - Duration of audio in seconds
 * @returns Cost in USD
 */
export function calculateTranscriptionCost(audioSeconds: number): number {
  return audioSeconds * VOICE_API_PRICE_PER_SECOND;
}

/**
 * Calculate audio duration from cost
 * @param costUsd - Cost in USD
 * @returns Duration in seconds
 */
export function calculateAudioSecondsFromCost(costUsd: number): number {
  return costUsd / VOICE_API_PRICE_PER_SECOND;
}

/**
 * Format cost as currency string
 * @param costUsd - Cost in USD
 * @returns Formatted string (e.g., "$4.50")
 */
export function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(2)}`;
}

/**
 * Format duration as human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "5m 30s" or "1h 15m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format time remaining as human-readable string
 * @param ms - Time in milliseconds
 * @returns Formatted string (e.g., "23h 45m")
 */
export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
