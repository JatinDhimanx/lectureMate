# RecallLoop 🧠⚡

**Turn Lecture Transcripts into Verifiable Mastery**

RecallLoop is a production-grade web application that converts messy, multi-hour lecture transcripts into source-grounded flashcards, interactive knowledge graphs, and adaptive quizzes powered by FSRS (Free Spaced Repetition Scheduler v5).

---

## 🌟 Core Highlights

- **100% Verbatim Evidence Grounding**: Every generated card is programmatically checked against raw lecture text with exact character offsets. No hallucinations.
- **FSRS Spaced Repetition (v5)**: Uses modern memory stability and difficulty modeling via `ts-fsrs`. Real-time next-interval previews (`Again · 10m | Hard · 1d | Good · 4d | Easy · 12d`).
- **Interactive Concept Maps**: Powered by React Flow (`@xyflow/react`) with mastery heatmaps (emerald/amber/indigo glow) and prerequisite dependency tracking.
- **Adaptive Diagnostic Quizzes**: Distractor options feature specific *misconception explanations* (`why_wrong`) linked to source material.
- **Multi-Format Ingestion**: Supports raw text paste, `.txt`, `.srt` / `.vtt` caption files with timestamp parsing, YouTube URLs, and audio/video files (with automatic 10-minute chunking via ffmpeg).
- **Dark-First Modern UI**: Built with Next.js 15 App Router, Tailwind CSS, Framer Motion 3D card flips, Lucide icons, and Geist typography.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript Strict
- **Styling**: Tailwind CSS + custom CSS variable tokens
- **Animations**: Framer Motion 3D transforms (`rotateY`)
- **AI / LLM**: Vercel AI SDK + Google Gemini 2.0 Flash (`@ai-sdk/google`) with strict Zod validation
- **Spaced Repetition**: `ts-fsrs` (v5)
- **Graph Visualization**: `@xyflow/react`
- **Database / ORM**: Drizzle ORM + PostgreSQL / Supabase with in-memory fallback
- **Parsers**: `subtitle`, `pdf-parse`, `youtube-transcript`, `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`
- **Testing**: `vitest` (unit) + `@playwright/test` (E2E)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 22)
- `pnpm` (v9 or v12)

### 2. Installation
```bash
git clone <repo-url>
cd RecalLoop
pnpm install
```

### 3. Environment Variables
Create a `.env.local` file from `.env.example`:
```bash
cp .env.example .env.local
```

Configure your keys:
```env
# Optional: Live Gemini Flash AI extraction.
# If omitted, RecallLoop operates in deterministic verified mock mode.
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Supabase / PostgreSQL Database URL
# If omitted, RecallLoop operates with in-memory persistence pre-loaded with demo data.
DATABASE_URL=postgresql://...
```

### 4. Running the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

### Run Unit Tests (Vitest)
```bash
pnpm test
```
Tests FSRS state transitions, verbatim substring verification, Jaccard deduplication, and subtitle parsing.

### Run E2E Tests (Playwright)
```bash
pnpm test:e2e
```

---

## 📁 Project Architecture

```
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/       # Bento overview, queue & stats
│   │   ├── upload/          # Multi-format ingest & SSE stepper
│   │   ├── lectures/        # Lecture library & detail views
│   │   ├── study/           # 3D FSRS active recall deck & evidence drawer
│   │   ├── quiz/            # Adaptive quiz runner with misconception feedback
│   │   ├── map/             # React Flow concept graphs & mastery heatmaps
│   │   └── settings/        # FSRS target retention & AI config
│   ├── api/
│   │   ├── pipeline/process # SSE streaming orchestrator
│   │   ├── lectures/        # Lecture CRUD
│   │   └── reviews/         # FSRS review logging & interval updates
│   ├── globals.css          # Token design system & 3D card perspective
│   └── page.tsx             # Landing hero & feature showcase
├── lib/
│   ├── ai/                  # Gemini provider & Zod extraction schemas
│   ├── db/                  # In-memory repo & mock dataset
│   ├── fsrs/                # FSRS scheduler, queue sorting & interval preview
│   ├── parsers/             # SRT, PDF, YouTube & ffmpeg audio chunkers
│   └── pipeline/            # Ingest, clean, segment, extract, generate & verify
├── tests/
│   ├── unit/                # Vitest unit test suite
│   └── e2e/                 # Playwright end-to-end tests
└── db/
    └── schema.ts            # Drizzle relational schema with RLS & FSRS indexes
```

---

## 📜 License
MIT License
