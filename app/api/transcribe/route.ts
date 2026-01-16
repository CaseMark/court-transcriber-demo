import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { transcribeAudioUrl } from '@/lib/case-dev/client';
import { LEGAL_VOCABULARY } from '@/lib/case-dev/legal-vocabulary';
import type { DemoUsage } from '@/lib/usage/types';
import { VOICE_API_PRICE_PER_SECOND, getUsageLimits, getSessionDurationMs } from '@/lib/usage/config';

/**
 * Transcription API Route
 *
 * Handles audio transcription via Case.dev API.
 * Accepts a Vercel Blob URL (uploaded client-side) instead of file upload
 * to bypass the 4.5MB Vercel serverless function limit.
 *
 * Includes demo usage limit enforcement.
 */

// Route segment config
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for transcription

interface TranscribeRequest {
  audioUrl: string;      // The Vercel Blob URL from client upload
  filename?: string;     // Original filename for metadata
  deleteAfter?: boolean; // Whether to delete the blob after transcription (default: true)
}

/**
 * Check if demo usage limits are exceeded
 */
function checkDemoLimits(usage: DemoUsage | null): { allowed: boolean; reason?: 'time_exceeded' | 'cost_exceeded' } {
  const limits = getUsageLimits();

  // If no usage data, allow (will be initialized on client)
  if (!usage) {
    return { allowed: true };
  }

  // Check time limit
  const sessionStartTime = new Date(usage.sessionStartedAt).getTime();
  const sessionDurationMs = getSessionDurationMs(limits.sessionHours);
  const sessionEndTime = sessionStartTime + sessionDurationMs;
  const now = Date.now();

  if (now >= sessionEndTime) {
    return { allowed: false, reason: 'time_exceeded' };
  }

  // Check cost limit
  if (usage.estimatedCostUsd >= limits.priceLimitUsd) {
    return { allowed: false, reason: 'cost_exceeded' };
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // Check demo usage limits
    const usageHeader = request.headers.get('X-Demo-Usage');
    let currentUsage: DemoUsage | null = null;

    if (usageHeader) {
      try {
        currentUsage = JSON.parse(usageHeader) as DemoUsage;
      } catch {
        // Invalid usage header, will be initialized on client
      }
    }

    const limitCheck = checkDemoLimits(currentUsage);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Demo limit exceeded',
          reason: limitCheck.reason,
          redirectUrl: 'https://console.case.dev',
          message: limitCheck.reason === 'time_exceeded'
            ? 'Your demo session has expired. Create a free account to continue.'
            : 'You\'ve reached the usage limit for this demo. Create a free account to continue.',
        },
        { status: 429 }
      );
    }

    // Parse JSON body
    let body: TranscribeRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Transcribe] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { audioUrl, filename, deleteAfter = true } = body;

    // Validate audioUrl
    if (!audioUrl || typeof audioUrl !== 'string') {
      return NextResponse.json(
        { error: 'audioUrl is required' },
        { status: 400 }
      );
    }

    if (!audioUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'audioUrl must be a valid HTTPS URL' },
        { status: 400 }
      );
    }

    // Validate it's a Vercel Blob URL (security check)
    if (!audioUrl.includes('.public.blob.vercel-storage.com/')) {
      return NextResponse.json(
        { error: 'audioUrl must be a Vercel Blob URL' },
        { status: 400 }
      );
    }

    if (!process.env.CASE_API_KEY) {
      return NextResponse.json(
        { error: 'CASE_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log(`[Transcribe] Processing audio URL: ${audioUrl}${filename ? ` (${filename})` : ''}`);

    // Call Case.dev API with the blob URL
    const result = await transcribeAudioUrl(audioUrl, {
      speakerLabels: true,
      vocabularyBoost: LEGAL_VOCABULARY,
    });

    // Clean up: delete the blob after transcription if requested
    if (deleteAfter) {
      try {
        await del(audioUrl);
        console.log('[Transcribe] Deleted blob:', audioUrl);
      } catch (e) {
        console.warn('[Transcribe] Failed to delete blob:', e);
        // Don't fail the request if cleanup fails
      }
    }

    // Calculate usage for this transcription
    const audioDurationSeconds = result.duration || 0;
    const transcriptionCost = audioDurationSeconds * VOICE_API_PRICE_PER_SECOND;

    // Return transcription result with usage data
    return NextResponse.json({
      text: result.text,
      segments: result.segments,
      speakers: result.speakers,
      duration: result.duration,
      language: result.language,
      // Usage data for client to track
      usage: {
        audioDurationSeconds,
        costUsd: transcriptionCost,
      },
    });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
