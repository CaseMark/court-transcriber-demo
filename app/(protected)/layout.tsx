'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UsageBanner, UsageIndicator } from '@/components/demo';
import {
  Gavel,
  House,
  Upload,
} from '@phosphor-icons/react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Gavel className="h-6 w-6 text-primary" weight="duotone" />
              <span className="text-xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>Court Transcriber</span>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  pathname === '/dashboard'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <House className="h-4 w-4" />
                  Dashboard
                </span>
              </Link>
              <Link
                href="/upload"
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  pathname === '/upload'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Upload className="h-4 w-4" />
                  Upload
                </span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <UsageIndicator />
          </div>
        </div>
      </header>

      {/* Usage Warning Banner */}
      <UsageBanner />

      {/* Main Content */}
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
