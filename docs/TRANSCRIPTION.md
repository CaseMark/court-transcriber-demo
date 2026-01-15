# Transcription Setup Guide

## Overview

The Court Transcriber uses Case.dev's Voice API for audio transcription with speaker diarization. The API requires a publicly accessible URL to the audio file, which means you need to expose your local development server for it to work.

## How It Works

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Your Server  │────▶│    ngrok     │────▶│  Case.dev   │
│  (upload)   │     │ (stores file) │     │ (public URL) │     │  (transcribe)│
└─────────────┘     └───────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            │                     │
                            └──────◀──────────────┘
                              (Case.dev fetches audio via ngrok URL)
```

1. User uploads an audio file through the browser
2. Server stores the file temporarily in memory
3. Server generates a public URL using ngrok
4. Server calls Case.dev API with the public URL
5. Case.dev fetches the audio file and transcribes it
6. Results are returned to the user

## Local Development Setup (ngrok)

### 1. Install ngrok

```bash
# macOS (Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Sign up for ngrok (free)

1. Go to https://ngrok.com
2. Create a free account
3. Copy your auth token from the dashboard

### 3. Configure ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 4. Start your development server

```bash
bun dev
```

### 5. Start ngrok tunnel (in a separate terminal)

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

### 6. Set the environment variable

Add the ngrok URL to your `.env.local`:

```env
# Case.dev API Key (required)
CASE_API_KEY=sk_case_...

# ngrok URL for transcription (required for local dev)
NGROK_URL=https://abc123.ngrok-free.app
```

> **Note:** The ngrok URL changes each time you restart ngrok (unless you have a paid plan with reserved domains). Update `NGROK_URL` whenever you restart ngrok.

### 7. Restart your dev server

After updating `.env.local`, restart your Next.js server to pick up the new environment variable.

## Production Deployment

In production, you don't need ngrok or any manual URL configuration.

### Vercel (Zero Config)

Vercel automatically provides `VERCEL_URL` - **no configuration needed**. The app will automatically use your deployment URL.

### Other Platforms

If not on Vercel, set `PUBLIC_URL` to your production domain:

```env
PUBLIC_URL=https://your-app.railway.app
```

Or use `NEXTAUTH_URL` if already configured for authentication.

## Troubleshooting

### Error: "NGROK_URL is not configured"

Make sure you have the `NGROK_URL` environment variable set in `.env.local` and that you've restarted your dev server.

### Error: "Either vault_id + object_id or audio_url is required"

This means the Case.dev API couldn't access your audio file URL. Check:

1. ngrok is running (`ngrok http 3000`)
2. `NGROK_URL` matches the ngrok forwarding URL
3. Your dev server is accessible through ngrok (try visiting the ngrok URL in your browser)

### Error: "Audio file not found"

The audio file may have expired from the temporary store (30-minute TTL). Try uploading again.

### ngrok connection reset or timeout

- Free ngrok connections may be slower
- Large files may take longer to transfer
- Consider using a paid ngrok plan for production testing

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `CASE_API_KEY` | Yes | Your Case.dev API key |
| `NGROK_URL` | Local dev | ngrok forwarding URL (e.g., `https://abc123.ngrok-free.app`) |
| `VERCEL_URL` | Auto | Automatically provided by Vercel - no config needed |
| `PUBLIC_URL` | Non-Vercel prod | Your production domain (if not on Vercel) |
| `NEXTAUTH_URL` | Optional | Falls back to this if others not set |

**Priority order:** `NGROK_URL` → `PUBLIC_URL` → `VERCEL_URL` → `NEXTAUTH_URL` → localhost

## File Size Limits

- Maximum file size: 500MB
- Supported formats: MP3, WAV, M4A, WebM, OGG
- Files are stored temporarily in memory for 30 minutes

