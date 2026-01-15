'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { DemoUsage, UsageCheckResult, UsageWarningLevel } from './types';
import { getOrCreateUsage, addTranscriptionUsage, getUsage } from './usage-storage';
import { checkUsageLimits, getWarningLevel } from './limit-checker';

interface UsageContextValue {
  usage: DemoUsage | null;
  checkResult: UsageCheckResult | null;
  warningLevel: UsageWarningLevel;
  isLoading: boolean;
  refreshUsage: () => void;
  trackTranscription: (audioDurationSeconds: number, costUsd: number) => void;
}

const UsageContext = createContext<UsageContextValue | null>(null);

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<DemoUsage | null>(null);
  const [checkResult, setCheckResult] = useState<UsageCheckResult | null>(null);
  const [warningLevel, setWarningLevel] = useState<UsageWarningLevel>('none');
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUsage = useCallback(() => {
    const currentUsage = getOrCreateUsage();
    const result = checkUsageLimits(currentUsage);
    const level = getWarningLevel(result);

    setUsage(currentUsage);
    setCheckResult(result);
    setWarningLevel(level);
    setIsLoading(false);
  }, []);

  const trackTranscription = useCallback((audioDurationSeconds: number, costUsd: number) => {
    const updatedUsage = addTranscriptionUsage(audioDurationSeconds, costUsd);
    const result = checkUsageLimits(updatedUsage);
    const level = getWarningLevel(result);

    setUsage(updatedUsage);
    setCheckResult(result);
    setWarningLevel(level);
  }, []);

  // Initialize on mount and set up periodic refresh for time-based limits
  useEffect(() => {
    refreshUsage();

    // Refresh every minute to update time-based limits
    intervalRef.current = setInterval(refreshUsage, 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshUsage]);

  // Listen for storage changes (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ccc:demoUsage') {
        refreshUsage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshUsage]);

  return (
    <UsageContext.Provider
      value={{
        usage,
        checkResult,
        warningLevel,
        isLoading,
        refreshUsage,
        trackTranscription,
      }}
    >
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}

/**
 * Hook to get current usage data for API requests
 */
export function useUsageHeader(): string | null {
  const { usage } = useUsage();
  if (!usage) return null;
  return JSON.stringify(usage);
}
