# Demo Usage Limits Implementation Plan

## Overview

Implement demo session limits using two environment variables:
- `DEMO_SESSION_HOURS=24` - Maximum session duration
- `DEMO_SESSION_PRICE_LIMIT=5` - Maximum dollar amount of API usage

## Pricing Reference

Based on case.dev API documentation:
- **Voice Transcription**: $0.30 per minute of audio
- **$5 limit** = ~16.67 minutes of transcription time
- The API returns `audio_duration` (in seconds) in transcription responses

**Cost Calculation**: `cost = (audio_duration / 60) * 0.30`

## Architecture

### Storage Strategy

Use **server-side session tracking** with cookies:
- Session ID stored in HTTP-only cookie
- Usage data stored in a lightweight JSON file store (dev) or Vercel KV (prod)
- More secure than client-side storage (can't be cleared by users)

### Components to Create/Modify

#### 1. New: Demo Usage Store (`lib/demo-usage.ts`)

```typescript
interface DemoSession {
  id: string;
  startedAt: string;           // ISO timestamp
  totalCostCents: number;      // Accumulated cost in cents
  transcriptionCount: number;  // Number of transcriptions
  totalMinutes: number;        // Total audio minutes processed
}

// Functions:
- createDemoSession(): DemoSession
- getDemoSession(sessionId: string): DemoSession | null
- updateDemoUsage(sessionId: string, audioDurationSeconds: number): DemoSession
- checkDemoLimits(sessionId: string): { allowed: boolean; reason?: string; usage: DemoUsageInfo }
- getDemoUsageInfo(sessionId: string): DemoUsageInfo
```

#### 2. New: Demo Session API (`app/api/demo/session/route.ts`)

```typescript
// GET - Get current session info and usage
// Returns: { session: DemoSession, limits: { hours, priceCents }, remaining: { hours, cents } }
```

#### 3. Modify: Transcribe API (`app/api/transcribe/route.ts`)

Add pre-flight and post-flight checks:

```typescript
// Before transcription:
1. Get session ID from cookie
2. Check if session exists, create if not
3. Check if limits exceeded -> return 403 with redirect URL

// After successful transcription:
4. Calculate cost from audio_duration
5. Update session usage
6. Return usage info in response
```

#### 4. New: Demo Limit Middleware (`middleware.ts` enhancement)

```typescript
// For protected routes:
1. Check for demo session cookie
2. If no session, create one
3. Check session age against DEMO_SESSION_HOURS
4. Check usage against DEMO_SESSION_PRICE_LIMIT
5. If exceeded, redirect to /demo-expired
```

#### 5. New: Demo Expired Page (`app/demo-expired/page.tsx`)

Shows:
- "Demo limit reached" message
- Usage summary (minutes used, cost)
- CTA button to console.case.dev
- Option to learn more about case.dev

#### 6. New: Demo Usage Display Component (`components/demo-usage.tsx`)

Shows in header/sidebar:
- Remaining usage (e.g., "$3.50 / $5.00 remaining")
- Session time remaining (e.g., "18 hours left")
- Warning when approaching limits (< 20% remaining)

## File Structure

```
lib/
  demo-usage.ts              # Core demo session logic
  demo-usage-store.ts        # Storage abstraction (file/KV)

app/
  api/
    demo/
      session/
        route.ts             # Demo session API endpoint
  demo-expired/
    page.tsx                 # Limit reached page

components/
  demo-usage-banner.tsx      # Usage display component
```

## Environment Variables

```env
# Demo Limits
DEMO_SESSION_HOURS=24
DEMO_SESSION_PRICE_LIMIT=5

# Optional: Vercel KV for production persistence
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. [ ] Create `lib/demo-usage.ts` with session management functions
2. [ ] Create `lib/demo-usage-store.ts` with file-based storage (dev) / memory fallback
3. [ ] Add environment variable types to `.env.example`

### Phase 2: API Integration
4. [ ] Create `app/api/demo/session/route.ts` for session info
5. [ ] Modify `app/api/transcribe/route.ts` to check and update usage
6. [ ] Update middleware to check demo limits on protected routes

### Phase 3: User Interface
7. [ ] Create `app/demo-expired/page.tsx` redirect page
8. [ ] Create `components/demo-usage-banner.tsx` for usage display
9. [ ] Add usage banner to protected layout header

### Phase 4: Polish
10. [ ] Add warning states when approaching limits
11. [ ] Add graceful error handling
12. [ ] Test edge cases (session expiry during transcription, etc.)

## API Response Changes

### Transcribe API Response (Enhanced)

```typescript
{
  // Existing fields
  text: string;
  segments: TranscriptSegment[];
  speakers: string[];
  duration: number;
  language: string;

  // New fields
  demoUsage: {
    thisCostCents: number;      // Cost of this transcription
    totalCostCents: number;     // Total accumulated cost
    limitCents: number;         // Limit from env
    remainingCents: number;     // Remaining budget
    sessionExpiresAt: string;   // When session expires
  }
}
```

### Error Response (Limit Exceeded)

```typescript
{
  error: "Demo limit exceeded",
  code: "DEMO_LIMIT_EXCEEDED",
  redirectUrl: "https://console.case.dev",
  usage: {
    totalCostCents: 500,
    limitCents: 500,
    reason: "price_limit" | "session_expired"
  }
}
```

## Redirect Behavior

When limits are exceeded:
1. API calls return 403 with `redirectUrl`
2. Middleware redirects page navigation to `/demo-expired`
3. `/demo-expired` page shows usage summary and CTA to console.case.dev

## Security Considerations

1. Session ID in HTTP-only cookie (not accessible via JS)
2. Server-side usage tracking (can't be tampered with client-side)
3. Rate limiting on session creation (prevent session farming)
4. Validate session ownership on API calls

## Testing

1. Unit tests for cost calculation
2. Integration tests for session lifecycle
3. E2E tests for limit enforcement
4. Edge cases:
   - Session expires mid-transcription
   - Concurrent transcriptions
   - Cookie cleared/blocked scenarios
