import { NextRequest, NextResponse } from 'next/server';
import { ocrFromUrl } from '@/lib/case-dev/client';
import { storeFile, validateFileStoreConfig, deleteFile } from '@/lib/file-store';

/**
 * OCR API Route
 *
 * Handles document OCR via Case.dev API.
 * - Production: Uses Vercel Blob for file storage
 * - Development: Uses in-memory store + cloudflared tunnel
 */

// Route segment config for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for OCR processing

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
  'image/webp',
];

const ALLOWED_EXTENSIONS = /\.(pdf|png|jpe?g|tiff?|webp)$/i;

function getMimeType(file: File): string {
  let mimeType = file.type;

  // Infer from extension if missing or generic
  if (!mimeType || mimeType === 'application/octet-stream') {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (name.endsWith('.png')) mimeType = 'image/png';
    else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (name.endsWith('.tiff') || name.endsWith('.tif')) mimeType = 'image/tiff';
    else if (name.endsWith('.webp')) mimeType = 'image/webp';
  }

  return mimeType;
}

export async function POST(request: NextRequest) {
  let fileUrl: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;
    const outputFormat = formData.get('outputFormat') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const mimeType = getMimeType(file);
    if (!ALLOWED_TYPES.includes(mimeType) && !file.name.match(ALLOWED_EXTENSIONS)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported formats: PDF, PNG, JPEG, TIFF, WebP' },
        { status: 400 }
      );
    }

    // Validate environment
    if (!process.env.CASE_API_KEY) {
      return NextResponse.json(
        { error: 'CASE_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const configCheck = validateFileStoreConfig();
    if (!configCheck.valid) {
      return NextResponse.json({ error: configCheck.error }, { status: 500 });
    }

    console.log(`[OCR] Processing file: ${file.name} (${file.size} bytes, type: ${mimeType})`);

    // Store file and get public URL
    const fileId = crypto.randomUUID();
    const buffer = await file.arrayBuffer();

    fileUrl = await storeFile(fileId, buffer, mimeType, file.name);
    console.log(`[OCR] File URL: ${fileUrl}`);

    // Call Case.dev OCR API
    const result = await ocrFromUrl(fileUrl, {
      language: language || 'en',
      outputFormat: (outputFormat as 'text' | 'json' | 'markdown') || 'text',
    });

    // Clean up file after processing (optional, only for Vercel Blob)
    if (process.env.BLOB_READ_WRITE_TOKEN && fileUrl) {
      await deleteFile(fileId, fileUrl);
    }

    return NextResponse.json({
      id: result.id,
      text: result.text,
      pages: result.pages,
      pageCount: result.pageCount,
    });
  } catch (error) {
    console.error('[OCR] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'OCR processing failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
