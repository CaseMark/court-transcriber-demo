# Cloud-Local Development with Cloudflared + Vercel Blob

This skill documents how to implement API calls that require a publicly accessible URL, using:
- **Production**: Vercel Blob for file storage (direct public URLs)
- **Development**: Cloudflared tunnel for exposing localhost

This pattern is essential when working with external APIs (like Case.dev) that need to fetch files via URL.

## Problem Statement

External APIs often require a URL to fetch files rather than accepting direct file uploads. Solutions:

| Environment | Solution | How It Works |
|-------------|----------|--------------|
| Production | Vercel Blob | Files uploaded to Vercel's CDN, direct public URLs |
| Development | cloudflared | Tunnel exposes localhost via public URL |

Why not ngrok? Free tier shows interstitial HTML pages that break file serving.

## Architecture Overview

```
┌─────────────────┐     1. Upload file      ┌─────────────────┐
│   Client/UI     │ ───────────────────────▶│  Your API       │
│                 │                         │  /api/process   │
└─────────────────┘                         └────────┬────────┘
                                                     │
                                            2. Store file in memory
                                               Generate public URL
                                                     │
                                                     ▼
┌─────────────────┐     3. Call external    ┌─────────────────┐
│  External API   │ ◀───────────────────────│  Your API       │
│  (Case.dev)     │     with public URL     │                 │
└────────┬────────┘                         └─────────────────┘
         │
         │ 4. External API fetches file via cloudflared tunnel
         ▼
┌─────────────────────────────────────────────────────────────┐
│  cloudflared tunnel                                         │
│  https://random-words.trycloudflare.com ──▶ localhost:3000  │
└─────────────────────────────────────────────────────────────┘
         │
         │ 5. Serve file from memory store
         ▼
┌─────────────────┐
│  /api/files/[id]│ ──▶ Returns binary file with correct Content-Type
└─────────────────┘
```

## Implementation Guide

### Step 1: Environment Configuration

**.env.local** (for local development):
```bash
# Case.dev API key
CASE_API_KEY=sk_case_your_api_key_here

# Cloudflared tunnel URL (set after starting tunnel)
# Run: cloudflared tunnel --url http://localhost:3000
# Copy the generated URL here
CLOUD_URL=https://your-random-words.trycloudflare.com
```

**.env.example** (for documentation):
```bash
CASE_API_KEY=sk_case_your_api_key_here

# For local development, run cloudflared tunnel:
#   cloudflared tunnel --url http://localhost:3000
# Then copy the generated URL here:
CLOUD_URL=https://your-tunnel-url.trycloudflare.com
```

### Step 2: In-Memory File Store

Create a temporary store for files that need to be served via public URL.

**lib/file-store.ts**:
```typescript
/**
 * Temporary in-memory file store
 *
 * Stores files temporarily so they can be served via a public URL
 * for external services that require a URL (like Case.dev OCR/transcription).
 *
 * Files are automatically cleaned up after the specified TTL.
 */

interface StoredFile {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  createdAt: number;
}

// In-memory store for files
const fileStore = new Map<string, StoredFile>();

// TTL for stored files (30 minutes)
const FILE_TTL_MS = 30 * 60 * 1000;

/**
 * Store a file and return its ID
 */
export function storeFile(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string
): void {
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

  console.log(`[FileStore] Stored file: ${id} (${buffer.byteLength} bytes)`);
}

/**
 * Retrieve a stored file
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
 */
export function deleteFile(id: string): void {
  fileStore.delete(id);
}

/**
 * Get the public URL for a stored file
 *
 * Priority order:
 * 1. CLOUD_URL - For local development with cloudflared tunnel
 * 2. VERCEL_URL - Auto-provided by Vercel (needs https:// prefix)
 * 3. localhost fallback (won't work for external services)
 */
export function getFileUrl(id: string): string {
  let baseUrl: string;

  if (process.env.CLOUD_URL) {
    // Local dev with cloudflared
    baseUrl = process.env.CLOUD_URL;
  } else if (process.env.VERCEL_URL) {
    // Vercel auto-provides this (without protocol)
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    // Local fallback - will NOT work for external APIs
    baseUrl = 'http://localhost:3000';
  }

  // IMPORTANT: This path must match your API route
  return `${baseUrl}/api/files/${id}`;
}
```

### Step 3: File Serving API Route

Create an API route to serve stored files.

**app/api/files/[id]/route.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getFile } from '@/lib/file-store';

/**
 * Serves stored files by ID
 *
 * This endpoint must be publicly accessible (no auth) so external
 * services can fetch files via the cloudflared tunnel.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const file = getFile(id);

  if (!file) {
    return NextResponse.json(
      { error: 'File not found or expired' },
      { status: 404 }
    );
  }

  // Return binary data with correct content type
  return new NextResponse(file.buffer, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Content-Length': file.buffer.byteLength.toString(),
      // Allow cross-origin requests from external services
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### Step 4: Middleware Configuration

Ensure the file serving route is publicly accessible (bypasses auth).

**middleware.ts**:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that should always be public (no auth required)
const alwaysPublicRoutes = [
  "/api/auth",
  "/api/health",
  "/api/webhooks",
  "/api/files",      // File serving for external services
  "/api/process",    // Your processing endpoint (if needed)
  "/api/test-tunnel", // Tunnel configuration test
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  for (const route of alwaysPublicRoutes) {
    if (pathname.startsWith(route)) {
      return NextResponse.next();
    }
  }

  // Your auth logic for protected routes...
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Step 5: Next.js Configuration

Allow cloudflared origins in development.

**next.config.ts**:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cloudflared tunnel URLs in development
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
```

### Step 6: Processing API Route

Your main API route that processes files via external service.

**app/api/process/route.ts** (example for OCR):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { storeFile, getFileUrl } from '@/lib/file-store';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate environment
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

    // Generate unique ID for this file
    const fileId = crypto.randomUUID();

    // Store file in memory
    const buffer = await file.arrayBuffer();

    // Detect/fix MIME type if needed
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Infer from extension
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
      // Add more as needed
    }

    storeFile(fileId, buffer, mimeType, file.name);

    // Get public URL that external service can access
    const fileUrl = getFileUrl(fileId);
    console.log(`[Process] File URL: ${fileUrl}`);

    // Call external API with the public URL
    const response = await fetch('https://api.case.dev/v1/your-endpoint', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CASE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: fileUrl,  // External service will fetch from this URL
        // ... other options
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Process] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

## Common Issues & Solutions

### Issue: "File type is text/html"

**Symptom**: External API reports receiving HTML instead of your file.

**Causes**:
1. **ngrok interstitial page** - ngrok free tier shows an HTML warning page
2. **Auth middleware blocking** - Your middleware is requiring auth on the file route
3. **Wrong URL generated** - The URL doesn't point to the correct route

**Solutions**:
1. Use cloudflared instead of ngrok (no interstitial)
2. Add file route to `alwaysPublicRoutes` in middleware
3. Verify URL format: `${CLOUD_URL}/api/files/${id}`

### Issue: File not found (404)

**Symptom**: External API gets 404 when fetching file.

**Causes**:
1. **ID mismatch** - ID used to store differs from ID in URL
2. **File expired** - TTL passed before external service fetched
3. **Route path mismatch** - URL path doesn't match API route

**Solutions**:
1. Log both store and fetch IDs to verify they match
2. Increase TTL or ensure external API is called immediately after storing
3. Verify `getFileUrl()` returns path matching your route structure

### Issue: CLOUD_URL not working

**Symptom**: Requests fail or go to wrong URL.

**Causes**:
1. **Trailing slash** - URL has trailing slash causing double slashes
2. **HTTP vs HTTPS** - cloudflared always uses HTTPS
3. **Stale URL** - Tunnel restarted with new URL

**Solutions**:
```typescript
// Remove trailing slash from CLOUD_URL
const baseUrl = process.env.CLOUD_URL?.replace(/\/$/, '') || '';
```

### Issue: Cross-origin warnings

**Symptom**: Next.js logs "Cross origin request detected" warnings.

**Solution**: Add to `next.config.ts`:
```typescript
allowedDevOrigins: ["*.trycloudflare.com"],
```

## Testing the Setup

### 1. Start cloudflared tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the generated URL (e.g., `https://random-words.trycloudflare.com`).

### 2. Set environment variable

```bash
# In .env.local
CLOUD_URL=https://random-words.trycloudflare.com
```

### 3. Test tunnel endpoint

Create a test route:

**app/api/test-tunnel/route.ts**:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Tunnel is configured correctly!',
    timestamp: new Date().toISOString(),
    cloudUrl: process.env.CLOUD_URL || 'not configured',
  });
}
```

Test from external network:
```bash
curl https://your-tunnel-url.trycloudflare.com/api/test-tunnel
```

### 4. Test file serving

```bash
# Upload a file and check the generated URL works
curl -I https://your-tunnel-url.trycloudflare.com/api/files/test-id
# Should return 404 (file not found) not HTML or auth error
```

## Case.dev Specific Notes

### For Transcription (audio_url)
```typescript
const result = await fetch('https://api.case.dev/voice/transcription', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CASE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    audio_url: fileUrl,
    speaker_labels: true,
  }),
});
```

### For OCR (file_url)
```typescript
const result = await fetch('https://api.case.dev/v1/ocr', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CASE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    file_url: fileUrl,
    // ... OCR options
  }),
});
```

## Checklist for New Projects

- [ ] Install cloudflared: `brew install cloudflared` (macOS)
- [ ] Create `lib/file-store.ts` with store/get/URL functions
- [ ] Create `app/api/files/[id]/route.ts` for serving files
- [ ] Add `/api/files` to `alwaysPublicRoutes` in middleware
- [ ] Add `allowedDevOrigins` to `next.config.ts`
- [ ] Add `CLOUD_URL` to `.env.local` and `.env.example`
- [ ] Create `app/api/test-tunnel/route.ts` for testing
- [ ] Test tunnel with `curl` before integrating with external API
