/**
 * Unified File Store for OCR
 *
 * Handles file storage for external API access:
 * - Production: Uses Vercel Blob (files stored in cloud, direct URLs)
 * - Development: Uses in-memory store + cloudflared tunnel
 *
 * This allows Case.dev OCR API to fetch files via public URL.
 */

import { put, del } from '@vercel/blob';

interface StoredFile {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  createdAt: number;
}

// In-memory store for development
const fileStore = new Map<string, StoredFile>();

// TTL for dev files (30 minutes)
const FILE_TTL_MS = 30 * 60 * 1000;

/**
 * Check if running in production (Vercel Blob available)
 */
function isProduction(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Store a file and return its public URL
 *
 * - Production: Uploads to Vercel Blob, returns blob URL
 * - Development: Stores in memory, returns cloudflared URL
 */
export async function storeFile(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<string> {
  if (isProduction()) {
    // Production: Upload to Vercel Blob
    const blob = await put(`ocr/${id}/${filename}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    console.log(`[FileStore] Uploaded to Vercel Blob: ${blob.url}`);
    return blob.url;
  }

  // Development: Store in memory
  fileStore.set(id, {
    buffer,
    mimeType,
    filename,
    createdAt: Date.now(),
  });

  // Schedule cleanup
  setTimeout(() => {
    fileStore.delete(id);
    console.log(`[FileStore] Cleaned up file: ${id}`);
  }, FILE_TTL_MS);

  console.log(`[FileStore] Stored file in memory: ${id} (${buffer.byteLength} bytes)`);

  return getFileUrl(id);
}

/**
 * Retrieve a stored file (development only)
 *
 * In production, files are served directly from Vercel Blob URLs.
 */
export function getFile(id: string): StoredFile | null {
  const file = fileStore.get(id);

  if (!file) {
    return null;
  }

  // Check if expired
  if (Date.now() - file.createdAt > FILE_TTL_MS) {
    fileStore.delete(id);
    return null;
  }

  return file;
}

/**
 * Delete a stored file
 *
 * - Production: Deletes from Vercel Blob
 * - Development: Deletes from memory
 */
export async function deleteFile(id: string, blobUrl?: string): Promise<void> {
  if (isProduction() && blobUrl) {
    await del(blobUrl);
    console.log(`[FileStore] Deleted from Vercel Blob: ${blobUrl}`);
  } else {
    fileStore.delete(id);
    console.log(`[FileStore] Deleted from memory: ${id}`);
  }
}

/**
 * Get the public URL for a stored file (development only)
 *
 * In production, use the URL returned by storeFile() instead.
 */
export function getFileUrl(id: string): string {
  if (isProduction()) {
    throw new Error('In production, use the URL returned by storeFile()');
  }

  const baseUrl = process.env.CLOUD_URL;
  if (!baseUrl) {
    console.warn('[FileStore] CLOUD_URL not set, using localhost (will not work with external APIs)');
    return `http://localhost:3000/api/files/${id}`;
  }

  return `${baseUrl}/api/files/${id}`;
}

/**
 * Validate environment configuration
 */
export function validateFileStoreConfig(): { valid: boolean; error?: string } {
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
