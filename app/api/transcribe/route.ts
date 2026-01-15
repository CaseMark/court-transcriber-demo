import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioUrl } from '@/lib/case-dev/client';
import { LEGAL_VOCABULARY } from '@/lib/case-dev/legal-vocabulary';
import { storeAudioFile, getAudioFileUrl } from '@/lib/audio-store';
import type { DemoUsage } from '@/lib/usage/types';
import { VOICE_API_PRICE_PER_SECOND, getUsageLimits, getSessionDurationMs } from '@/lib/usage/config';

/**
 * Transcription API Route
 *
 * Handles audio transcription via Case.dev API using cloudflared for public URL.
 * Includes demo usage limit enforcement.
 */

// Route segment config for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for transcription

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

    // Parse FormData with explicit error handling for large files
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('[Transcribe] FormData parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse upload. File may be too large or upload was interrupted.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const recordingId = formData.get('recordingId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type - check both MIME type and extension
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/m4a',
      'audio/mp4',
      'audio/x-m4a',
      'audio/webm',
      'audio/ogg',
      'application/octet-stream', // Allow generic binary if extension matches
    ];

    const allowedExtensions = /\.(mp3|wav|m4a|webm|ogg)$/i;
    const hasValidType = allowedTypes.includes(file.type);
    const hasValidExtension = allowedExtensions.test(file.name);

    if (!hasValidType && !hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported formats: MP3, WAV, M4A, WebM, OGG' },
        { status: 400 }
      );
    }

    if (!process.env.CASE_API_KEY) {
      return NextResponse.json(
        { error: 'CASE_API_KEY is not configured' },
        { status: 500 }
      );
    }

    if (!process.env.CLOUD_URL && !process.env.VERCEL_URL) {
      return NextResponse.json(
        { error: 'CLOUD_URL is not configured. Run: cloudflared tunnel --url http://localhost:3000' },
        { status: 500 }
      );
    }

    console.log(`[Transcribe] Processing file: ${file.name} (${file.size} bytes, type: ${file.type})`);

    // Store file in memory
    const fileId = recordingId || crypto.randomUUID();

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (bufferError) {
      console.error('[Transcribe] Buffer read error:', bufferError);
      return NextResponse.json(
        { error: 'Failed to read file data. Please try uploading again.' },
        { status: 400 }
      );
    }

    // Detect MIME type from extension if not provided or generic
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = file.name.toLowerCase().split('.').pop();
      const mimeMap: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        webm: 'audio/webm',
        ogg: 'audio/ogg',
      };
      mimeType = mimeMap[ext || ''] || 'audio/mpeg';
    }

    storeAudioFile(fileId, buffer, mimeType, file.name);

    const audioUrl = getAudioFileUrl(fileId);
    console.log(`[Transcribe] Audio URL: ${audioUrl}`);

    // Call Case.dev API
    const result = await transcribeAudioUrl(audioUrl, {
      speakerLabels: true,
      vocabularyBoost: LEGAL_VOCABULARY,
    });

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
