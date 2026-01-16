/**
 * Client-Side Upload Utility
 *
 * Uploads files directly to Vercel Blob from the browser,
 * bypassing the 4.5MB serverless function limit.
 */

import { upload } from '@vercel/blob/client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  pathname: string;
}

/**
 * Upload an audio file directly to Vercel Blob
 *
 * @param file - The audio file to upload
 * @param onProgress - Optional callback for upload progress
 * @returns The blob URL and pathname
 */
export async function uploadAudioFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Generate a unique path for the file
  const fileId = crypto.randomUUID();
  const pathname = `audio/${fileId}/${file.name}`;

  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload-token',
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: Math.round((progressEvent.loaded / progressEvent.total) * 100),
        });
      }
    },
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}
