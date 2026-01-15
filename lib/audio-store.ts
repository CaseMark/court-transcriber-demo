/**
 * Temporary in-memory audio file store
 * 
 * Stores audio files temporarily so they can be served via a public URL
 * for transcription services that require a URL (like Case.dev).
 * 
 * Files are automatically cleaned up after the specified TTL.
 */

interface StoredAudio {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  createdAt: number;
}

// In-memory store for audio files
const audioStore = new Map<string, StoredAudio>();

// TTL for stored files (30 minutes)
const FILE_TTL_MS = 30 * 60 * 1000;

/**
 * Store an audio file and return its ID
 */
export function storeAudioFile(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string
): void {
  audioStore.set(id, {
    buffer,
    mimeType,
    filename,
    createdAt: Date.now(),
  });

  // Schedule cleanup
  setTimeout(() => {
    audioStore.delete(id);
    console.log(`[AudioStore] Cleaned up file: ${id}`);
  }, FILE_TTL_MS);

  console.log(`[AudioStore] Stored file: ${id} (${buffer.byteLength} bytes)`);
}

/**
 * Retrieve a stored audio file
 */
export function getAudioFile(id: string): StoredAudio | null {
  const audio = audioStore.get(id);
  
  if (!audio) {
    return null;
  }

  // Check if expired
  if (Date.now() - audio.createdAt > FILE_TTL_MS) {
    audioStore.delete(id);
    return null;
  }

  return audio;
}

/**
 * Delete a stored audio file
 */
export function deleteAudioFile(id: string): void {
  audioStore.delete(id);
}

/**
 * Get the public URL for a stored audio file
 *
 * Priority order:
 * 1. CLOUD_URL - For local development with cloudflared tunnel
 * 2. VERCEL_URL - Auto-provided by Vercel (needs https:// prefix)
 * 3. localhost fallback (won't work for external services)
 */
export function getAudioFileUrl(id: string): string {
  let baseUrl: string;

  if (process.env.CLOUD_URL) {
    // Local dev with cloudflared
    baseUrl = process.env.CLOUD_URL;
  } else if (process.env.VERCEL_URL) {
    // Vercel auto-provides this (without protocol)
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    // Local fallback
    baseUrl = 'http://localhost:3000';
  }

  return `${baseUrl}/api/audio/${id}`;
}

