import { NextRequest, NextResponse } from 'next/server';
import { getFile } from '@/lib/file-store';

/**
 * Serve stored files for OCR (development only)
 *
 * This endpoint serves files stored in memory so that Case.dev
 * can access them via cloudflared tunnel during local development.
 *
 * In production, files are served directly from Vercel Blob URLs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log(`[FilesAPI] Request for file: ${id}`);

  // In production, this endpoint shouldn't be called
  // Files are served directly from Vercel Blob URLs
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse('Files are served from Vercel Blob in production', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const fileData = getFile(id);

  if (!fileData) {
    console.log(`[FilesAPI] File not found: ${id}`);
    return new NextResponse(`File not found: ${id}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.log(`[FilesAPI] Serving file: ${id} (${fileData.buffer.byteLength} bytes, ${fileData.mimeType})`);

  return new NextResponse(fileData.buffer, {
    headers: {
      'Content-Type': fileData.mimeType,
      'Content-Length': String(fileData.buffer.byteLength),
      'Content-Disposition': `inline; filename="${fileData.filename}"`,
      'Cache-Control': 'private, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
