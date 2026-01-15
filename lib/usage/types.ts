/**
 * Demo Usage Types
 *
 * Types for tracking demo session usage and limits.
 */

export interface DemoUsage {
  sessionId: string;
  sessionStartedAt: string;      // ISO timestamp
  totalAudioSeconds: number;     // Total audio transcribed
  estimatedCostUsd: number;      // Running cost estimate
  transcriptionCount: number;    // Number of transcriptions
}

export interface UsageCheckResult {
  isAllowed: boolean;
  reason?: 'time_exceeded' | 'cost_exceeded';
  timeRemainingMs?: number;      // ms remaining
  costRemainingUsd?: number;     // dollars remaining
  percentTimeUsed: number;
  percentCostUsed: number;
}

export interface UsageLimits {
  sessionHours: number;
  priceLimitUsd: number;
}

export type UsageWarningLevel = 'none' | 'approaching' | 'near' | 'exceeded';
