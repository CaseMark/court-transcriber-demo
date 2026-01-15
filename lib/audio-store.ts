/**
 * Audio File Store for Transcription
 *
 * Handles audio file storage for external API access:
 * - Production: Uses Vercel Blob (files stored in cloud, direct URLs)
 * - Development: Uses in-memory store + cloudflared tunnel
 *
 * This allows Case.dev Transcription API to fetch audio files via public URL.
 */

import { put, del } from '@vercel/blob';

interface StoredAudio {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  createdAt: number;
}

// In-memory store for development
const audioStore = new Map<string, StoredAudio>();

// TTL for dev files (30 minutes)
const FILE_TTL_MS = 30 * 60 * 1000;

/**
 * Check if running in production (Vercel Blob available)
 */
function isProduction(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Store an audio file and return its public URL
 *
 * - Production: Uploads to Vercel Blob, returns blob URL
 * - Development: Stores in memory, returns cloudflared URL
 */
export async function storeAudioFile(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<string> {
  if (isProduction()) {
    // Production: Upload to Vercel Blob
    const blob = await put(`audio/${id}/${filename}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    console.log(`[AudioStore] Uploaded to Vercel Blob: ${blob.url}`);
    return blob.url;
  }

  // Development: Store in memory
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

  console.log(`[AudioStore] Stored file in memory: ${id} (${buffer.byteLength} bytes)`);

  return getAudioFileUrl(id);
}

/**
 * Retrieve a stored audio file (development only)
 *
 * In production, files are served directly from Vercel Blob URLs.
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
 *
 * - Production: Deletes from Vercel Blob
 * - Development: Deletes from memory
 */
export async function deleteAudioFile(id: string, blobUrl?: string): Promise<void> {
  if (isProduction() && blobUrl) {
    await del(blobUrl);
    console.log(`[AudioStore] Deleted from Vercel Blob: ${blobUrl}`);
  } else {
    audioStore.delete(id);
    console.log(`[AudioStore] Deleted from memory: ${id}`);
  }
}

/**
 * Get the public URL for a stored audio file (development only)
 *
 * In production, use the URL returned by storeAudioFile() instead.
 */
export function getAudioFileUrl(id: string): string {
  if (isProduction()) {
    throw new Error('In production, use the URL returned by storeAudioFile()');
  }

  const baseUrl = process.env.CLOUD_URL;
  if (!baseUrl) {
    console.warn('[AudioStore] CLOUD_URL not set, using localhost (will not work with external APIs)');
    return `http://localhost:3000/api/audio/${id}`;
  }

  return `${baseUrl}/api/audio/${id}`;
}

/**
 * Validate environment configuration
 */
export function validateAudioStoreConfig(): { valid: boolean; error?: string } {
  if (isProduction()) {
    // Production requires BLOB_READ_WRITE_TOKEN (already checked via isProduction)
    return { valid: true };
  }

  // Development requires CLOUD_URL for cloudflared
  if (!process.env.CLOUD_URL) {
    return {
      valid: false,
      error: 'CLOUD_URL is not configured. Run: cloudflared tunnel --url http://localhost:3000',
    };
  }

  return { valid: true };
}
