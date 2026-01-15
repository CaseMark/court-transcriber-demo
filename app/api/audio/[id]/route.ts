import { NextRequest, NextResponse } from 'next/server';
import { getAudioFile } from '@/lib/audio-store';

/**
 * Serve audio files for transcription
 *
 * This endpoint serves temporarily stored audio files so that
 * Case.dev can access them via a public URL (using ngrok in development).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log(`[AudioAPI] Request for audio file: ${id}`);

  const audioData = getAudioFile(id);

  if (!audioData) {
    console.log(`[AudioAPI] File not found: ${id}`);
    // Return a plain text error instead of JSON to avoid confusion
    return new NextResponse(`Audio file not found: ${id}`, {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  console.log(`[AudioAPI] Serving file: ${id} (${audioData.buffer.byteLength} bytes, ${audioData.mimeType})`);

  // Ensure proper MIME type for m4a files
  let mimeType = audioData.mimeType;
  if (audioData.filename.endsWith('.m4a') && !mimeType.includes('m4a') && !mimeType.includes('mp4')) {
    mimeType = 'audio/mp4';
  }

  return new NextResponse(audioData.buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(audioData.buffer.byteLength),
      'Content-Disposition': `inline; filename="${audioData.filename}"`,
      'Cache-Control': 'private, max-age=3600',
      // CORS headers for external access
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
