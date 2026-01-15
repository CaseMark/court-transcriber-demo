'use client';

import { useUsage } from '@/lib/usage/usage-context';
import { formatCost, formatTimeRemaining } from '@/lib/usage/cost-calculator';
import { getUsageLimits } from '@/lib/usage/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Info, Clock, CurrencyDollar, ArrowSquareOut } from '@phosphor-icons/react';

export function UsageIndicator() {
  const { checkResult, usage, isLoading } = useUsage();

  if (isLoading || !checkResult) {
    return null;
  }

  const limits = getUsageLimits();
  const maxPercent = Math.max(checkResult.percentTimeUsed, checkResult.percentCostUsed);

  // Dot color based on usage
  let dotColor = 'bg-green-500';
  if (maxPercent >= 75) {
    dotColor = 'bg-red-500';
  } else if (maxPercent >= 50) {
    dotColor = 'bg-yellow-500';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" />}
      >
        <span className={`h-2 w-2 ${dotColor}`} />
        <span className="text-xs">Demo</span>
        <Info className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Demo Session</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 space-y-3 text-sm">
          {/* Time Usage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Time Remaining
              </span>
              <span>{formatTimeRemaining(checkResult.timeRemainingMs || 0)}</span>
            </div>
            <div className="h-1.5 bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${100 - checkResult.percentTimeUsed}%` }}
              />
            </div>
          </div>

          {/* Cost Usage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CurrencyDollar className="h-3.5 w-3.5" />
                Usage Remaining
              </span>
              <span>
                {formatCost(checkResult.costRemainingUsd || 0)} / {formatCost(limits.priceLimitUsd)}
              </span>
            </div>
            <div className="h-1.5 bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${100 - checkResult.percentCostUsed}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          {usage && usage.transcriptionCount > 0 && (
            <div className="pt-1 text-xs text-muted-foreground">
              {usage.transcriptionCount} transcription{usage.transcriptionCount !== 1 ? 's' : ''} completed
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center justify-between cursor-pointer"
          onClick={() => {
            window.open('https://console.case.dev', '_blank', 'noopener,noreferrer');
          }}
        >
          <span>Create free account</span>
          <ArrowSquareOut className="h-4 w-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
