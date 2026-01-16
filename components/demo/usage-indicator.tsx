'use client';

import { useUsage } from '@/lib/usage/usage-context';
import { formatCost, formatTimeRemaining } from '@/lib/usage/cost-calculator';
import { getUsageLimits } from '@/lib/usage/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Info, Clock, CurrencyDollar, ArrowSquareOut, Database } from '@phosphor-icons/react';

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
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-xs">Demo</span>
        <Info className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {/* Header */}
        <div className="px-3 py-2.5">
          <div className="font-medium text-sm">Demo Session</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Try the Court Transcriber with limited usage
          </p>
        </div>
        <DropdownMenuSeparator />

        <div className="px-3 py-3 space-y-4 text-sm">
          {/* Demo Limits Info */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Demo Limits
            </div>

            {/* Time Usage */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Time Remaining
                </span>
                <span className="font-medium text-foreground">
                  {formatTimeRemaining(checkResult.timeRemainingMs || 0)}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all rounded-full"
                  style={{ width: `${100 - checkResult.percentTimeUsed}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {limits.sessionHours}-hour session limit
              </div>
            </div>

            {/* Cost Usage */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CurrencyDollar className="h-3.5 w-3.5" />
                  Usage Remaining
                </span>
                <span className="font-medium text-foreground">
                  {formatCost(checkResult.costRemainingUsd || 0)} / {formatCost(limits.priceLimitUsd)}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all rounded-full"
                  style={{ width: `${100 - checkResult.percentCostUsed}%` }}
                />
              </div>
            </div>
          </div>

          {/* Storage Info */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Data Storage
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                All transcriptions are stored locally in your browser. Data is never uploaded to external servers.
              </span>
            </div>
          </div>

          {/* Stats */}
          {usage && usage.transcriptionCount > 0 && (
            <div className="pt-1 text-xs text-muted-foreground border-t pt-2">
              {usage.transcriptionCount} transcription{usage.transcriptionCount !== 1 ? 's' : ''} completed this session
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* CTA */}
        <div className="p-2">
          <DropdownMenuItem
            className="flex items-center justify-between cursor-pointer bg-primary/5 hover:bg-primary/10"
            onClick={() => {
              window.open('https://console.case.dev', '_blank', 'noopener,noreferrer');
            }}
          >
            <div>
              <div className="font-medium">Get Full Access</div>
              <div className="text-xs text-muted-foreground">Create a free account at case.dev</div>
            </div>
            <ArrowSquareOut className="h-4 w-4 flex-shrink-0" />
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
