'use client';

import { UsageProvider } from '@/lib/usage/usage-context';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <UsageProvider>{children}</UsageProvider>;
}
