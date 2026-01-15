'use client';

import { useUsage } from '@/lib/usage/usage-context';
import { getLimitExceededMessage } from '@/lib/usage/limit-checker';
import { formatCost, formatDuration } from '@/lib/usage/cost-calculator';
import { getUsageLimits } from '@/lib/usage/config';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Clock, CurrencyDollar, ArrowSquareOut } from '@phosphor-icons/react';

interface LimitExceededDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LimitExceededDialog({ open, onOpenChange }: LimitExceededDialogProps) {
  const { checkResult, usage } = useUsage();
  const limits = getUsageLimits();

  if (!checkResult || checkResult.isAllowed) {
    return null;
  }

  const reason = checkResult.reason || 'cost_exceeded';
  const message = getLimitExceededMessage(reason);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Demo Limit Reached</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{message}</p>

            <div className="bg-muted p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Session Duration
                </span>
                <span className="font-medium">{limits.sessionHours} hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CurrencyDollar className="h-4 w-4" />
                  Usage Limit
                </span>
                <span className="font-medium">{formatCost(limits.priceLimitUsd)}</span>
              </div>
              {usage && (
                <>
                  <div className="border-t my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Audio Transcribed</span>
                    <span className="font-medium">{formatDuration(usage.totalAudioSeconds)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Your Usage</span>
                    <span className="font-medium">{formatCost(usage.estimatedCostUsd)}</span>
                  </div>
                </>
              )}
            </div>

            <p className="text-sm">
              Create a free account at case.dev to continue using the Court Transcriber with higher limits.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              window.open('https://console.case.dev', '_blank', 'noopener,noreferrer');
            }}
          >
            Create Free Account
            <ArrowSquareOut className="h-4 w-4 ml-2" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
