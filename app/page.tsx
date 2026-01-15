'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Microphone,
  Users,
  MagnifyingGlass,
  FileText,
  Play,
  Gavel,
} from '@phosphor-icons/react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" weight="duotone" />
            <span className="text-xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>Court Transcriber</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }))}>
              Dashboard
            </Link>
            <Link href="/upload" className={cn(buttonVariants())}>
              Upload Recording
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-3xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-normal tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            AI-Powered Court Transcription
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload court recordings and get accurate transcripts with automatic
            speaker identification, synchronized playback, and professional
            export options.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/upload"
              className={cn(buttonVariants({ size: 'lg' }))}
            >
              <Microphone className="mr-2 h-5 w-5" />
              Start Transcribing
            </Link>
            <Link
              href="#features"
              className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-card py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-normal text-center mb-12" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Features Built for Legal Professionals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="border bg-background p-6 space-y-3">
              <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                <Microphone className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium">Upload & Transcribe</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop audio files in MP3, WAV, or M4A formats. Our AI
                processes your recordings with legal vocabulary optimization.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border bg-background p-6 space-y-3">
              <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium">Speaker Identification</h3>
              <p className="text-sm text-muted-foreground">
                Automatic detection of different speakers with customizable
                labels. Identify judges, attorneys, witnesses, and more.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border bg-background p-6 space-y-3">
              <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                <Play className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium">Synchronized Playback</h3>
              <p className="text-sm text-muted-foreground">
                Click any transcript line to jump to that exact moment in the
                audio. Review and verify transcription accuracy with ease.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="border bg-background p-6 space-y-3">
              <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                <MagnifyingGlass className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium">Search Functionality</h3>
              <p className="text-sm text-muted-foreground">
                Find and highlight specific words or phrases instantly. Jump
                directly to relevant testimony or statements.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="border bg-background p-6 space-y-3">
              <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium">Professional Exports</h3>
              <p className="text-sm text-muted-foreground">
                Export transcripts in PDF, Word, or plain text formats with
                proper legal formatting and speaker attributions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="border bg-background p-6 space-y-3">
              <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium">Legal Vocabulary</h3>
              <p className="text-sm text-muted-foreground">
                Enhanced accuracy for court-specific terminology, objections,
                motions, and legal phrases commonly used in proceedings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-normal mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start transcribing your court recordings today. All data is stored
            securely in your browser.
          </p>
          <Link
            href="/upload"
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            Upload Your First Recording
          </Link>
        </div>
      </section>
    </div>
  );
}
