'use client';

import { useUsage } from '@/lib/usage/usage-context';
import { formatCost, formatTimeRemaining } from '@/lib/usage/cost-calculator';
import { getUsageLimits } from '@/lib/usage/config';
import { X, Warning, Clock, CurrencyDollar } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function UsageBanner() {
  const { checkResult, warningLevel } = useUsage();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no warnings or dismissed
  if (!checkResult || warningLevel === 'none' || warningLevel === 'exceeded' || dismissed) {
    return null;
  }

  const limits = getUsageLimits();
  const isTimeWarning = checkResult.percentTimeUsed > checkResult.percentCostUsed;
  const maxPercent = Math.max(checkResult.percentTimeUsed, checkResult.percentCostUsed);

  // Banner colors based on warning level
  const bannerStyles = {
    approaching: 'bg-amber-50 border-amber-200 text-amber-800',
    near: 'bg-orange-50 border-orange-200 text-orange-800',
  }[warningLevel] || '';

  const iconColor = {
    approaching: 'text-amber-500',
    near: 'text-orange-500',
  }[warningLevel] || '';

  return (
    <div className={`border-b px-4 py-2 flex items-center justify-between gap-4 ${bannerStyles}`}>
      <div className="flex items-center gap-3">
        <Warning className={`h-5 w-5 ${iconColor}`} weight="fill" />
        <div className="text-sm">
          {warningLevel === 'approaching' && (
            <span>
              <strong>Approaching demo limit</strong> ({Math.round(maxPercent)}% used)
            </span>
          )}
          {warningLevel === 'near' && (
            <span>
              <strong>Near demo limit</strong> ({Math.round(maxPercent)}% used)
            </span>
          )}
          <span className="mx-2">|</span>
          {isTimeWarning ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimeRemaining(checkResult.timeRemainingMs || 0)} remaining
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <CurrencyDollar className="h-4 w-4" />
              {formatCost(checkResult.costRemainingUsd || 0)} of {formatCost(limits.priceLimitUsd)} remaining
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="https://console.case.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium underline underline-offset-2 hover:no-underline"
        >
          Create free account
        </a>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
