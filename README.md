# Court Transcriber

**AI-Powered Court Recording Transcription**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black)](https://nextjs.org)
[![Case.dev](https://img.shields.io/badge/Powered%20by-Case.dev-EB5600)](https://case.dev)

A demo application for transcribing court recordings with automatic speaker identification, synchronized playback, and professional export options. Built with the [Case.dev](https://case.dev) Voice API.

## Features

- **Audio Transcription**: Upload court recordings in MP3, WAV, M4A, WebM, or OGG formats (up to 500MB)
- **Speaker Identification**: Automatic detection and labeling of different speakers (Judge, Attorney, Witness, etc.)
- **Legal Vocabulary**: Enhanced accuracy for court-specific terminology, objections, motions, and legal phrases
- **Synchronized Playback**: Click any transcript line to jump to that exact moment in the audio
- **Search Functionality**: Find and highlight specific words or phrases instantly
- **Editable Transcripts**: Inline editing to correct transcription errors
- **Professional Exports**: Export transcripts in PDF, Word (DOCX), or plain text formats with proper formatting

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) with custom legal tech theme
- **UI Components**: Base UI + custom components
- **Icons**: [Phosphor Icons](https://phosphoricons.com)
- **Fonts**: [Inter](https://rsms.me/inter/) (body) + [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) (headings)
- **Package Manager**: [Bun](https://bun.sh)
- **AI/ML**: [Case.dev Voice API](https://case.dev) for transcription

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (for local development)
- A [Case.dev](https://console.case.dev) API key

### Installation

```bash
git clone https://github.com/CaseMark/court-transcriber-demo.git
cd court-transcriber-demo
bun install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure your environment variables:

```env
# Required: Case.dev API key (get from https://console.case.dev)
CASE_API_KEY=sk_case_your_api_key_here

# Required for local development: Cloudflare tunnel URL
# Run: cloudflared tunnel --url http://localhost:3000
# Then copy the https URL here
CLOUD_URL=https://your-tunnel-url.trycloudflare.com

# Demo limits (optional - defaults shown)
NEXT_PUBLIC_DEMO_SESSION_HOURS=24
NEXT_PUBLIC_DEMO_SESSION_PRICE_LIMIT=5
```

### Running the Development Server

1. Start the cloudflared tunnel (required for Case.dev API to fetch audio files):

```bash
cloudflared tunnel --url http://localhost:3000
```

2. Copy the tunnel URL to your `.env.local` as `CLOUD_URL`

3. Start the development server:

```bash
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Database Configuration

This demo uses **browser-based storage** for simplicity:

- **IndexedDB**: User accounts, sessions, and authentication data
- **localStorage**: Application state and demo usage tracking

**No external database is required.** All data is stored locally in the user's browser, making it easy to deploy and run without infrastructure setup.

For production deployments requiring persistent server-side storage, see the database skill documentation in `skills/database/`.

## API Pricing

The Court Transcriber uses the [Case.dev Voice API](https://case.dev) for transcription:

| Service | Price |
|---------|-------|
| Voice Transcription | **$0.30 per minute** of audio |

Example costs:
- 5 minute recording: $1.50
- 30 minute hearing: $9.00
- 2 hour deposition: $36.00

Pricing is based on the actual duration of the audio file, not processing time.

## Demo Usage Limits

This demo application has built-in usage limits:

| Limit | Value |
|-------|-------|
| Session Duration | **24 hours** |
| Usage Limit | **$5.00** (~16.67 minutes of transcription) |

Once you reach either limit, you will need to create a free account at [console.case.dev](https://console.case.dev) to continue with unlimited access.

### Usage Tracking

The demo displays your usage status:
- **Header indicator**: Shows remaining usage with color-coded status (green/yellow/red)
- **Warning banners**: Appear when approaching (75%) or near (90%) the limit
- **Limit dialog**: Prompts you to create an account when limits are reached

## Project Structure

```
├── app/
│   ├── (auth)/           # Login and signup pages
│   ├── (protected)/      # Authenticated routes
│   │   ├── dashboard/    # Recording list
│   │   ├── upload/       # Upload and transcribe
│   │   └── recording/    # View and edit transcripts
│   └── api/
│       ├── transcribe/   # Transcription endpoint
│       ├── audio/        # Audio file serving
│       └── ocr/          # OCR processing
├── components/
│   ├── ui/               # Base UI components
│   ├── demo/             # Demo usage components
│   └── auth/             # Authentication forms
├── lib/
│   ├── case-dev/         # Case.dev API client
│   ├── usage/            # Usage tracking module
│   ├── storage/          # IndexedDB helpers
│   └── export/           # Transcript export utilities
├── skills/               # AI agent documentation
└── docs/                 # Additional documentation
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables:
   - `CASE_API_KEY`
   - `NEXT_PUBLIC_DEMO_SESSION_HOURS`
   - `NEXT_PUBLIC_DEMO_SESSION_PRICE_LIMIT`
4. Deploy

Note: When deployed to Vercel, the `CLOUD_URL` is not needed as Vercel provides public URLs automatically.

### Other Platforms

The app can be deployed to any platform that supports Next.js. Ensure you configure a method for the Case.dev API to access uploaded audio files (e.g., Vercel Blob, S3, or similar).

## For AI Agents

This repository includes comprehensive documentation for AI coding assistants:

- **[AGENTS.md](./AGENTS.md)**: Project architecture and principles
- **[skills/](./skills/)**: Feature-specific implementation guides
- **[docs/UI-STYLING-GUIDE.md](./docs/UI-STYLING-GUIDE.md)**: Visual styling reference

## License

This project is licensed under the [Apache 2.0 License](LICENSE).

---

**Questions?** Visit [case.dev](https://case.dev) or create an issue in this repository.
