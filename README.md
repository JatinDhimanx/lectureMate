# LectureMate

LectureMate turns lecture material into an active-recall study workspace. Upload notes, documents, captions, audio, or a YouTube lecture; LectureMate cleans and segments the content, extracts concepts, generates flashcards and diagnostic quizzes, and keeps the resulting material ready for spaced-repetition review.

## What it includes

- **Multi-format ingestion** for pasted text, Markdown, TXT, PDF, DOC/DOCX, PPTX, XLS/XLSX, CSV, SRT/VTT, YouTube URLs, audio files, and microphone recordings.
- **AI-assisted study material generation** using Google Gemini when `GEMINI_API_KEY` is configured.
- **Deterministic fallback generation** for local development without an AI key.
- **Evidence-grounded flashcards and quizzes** with verbatim quote checks, character spans, quality scoring, and near-duplicate removal.
- **FSRS spaced repetition** with Again, Hard, Good, and Easy scheduling, due queues, interval previews, and review history.
- **Interactive concept maps** showing extracted concepts, prerequisites, and mastery heatmaps.
- **Lecture library and dashboard** for recent material, review statistics, study sessions, and quiz analytics.
- **Authentication flows** including sign-up, email verification, login, logout, password reset, and account password updates.
- **Streaming processing updates** through server-sent events while a lecture is being analyzed.

## How processing works

The upload pipeline runs these stages:

1. Ingest and normalize the selected source.
2. Clean the transcript and detect its language.
3. Segment the material into sections.
4. Extract concepts, definitions, importance scores, and prerequisite relationships.
5. Generate flashcards across Bloom levels and card types.
6. Generate multiple-choice and true/false quiz questions.
7. Verify evidence quotes, score quality, and remove duplicates.
8. Save the lecture, cards, concepts, quizzes, and review metadata.

When Gemini is unavailable, the local generators still produce content from high-value academic sentences and concept definitions.

## Tech stack

- Next.js 16 App Router and React 19
- TypeScript with strict checking
- Tailwind CSS 4
- Google Gemini through the Vercel AI SDK
- Drizzle ORM and PostgreSQL schema definitions
- Supabase Auth and database client integration
- `ts-fsrs` for spaced repetition scheduling
- React Flow for concept maps
- Vitest for unit tests and Playwright for end-to-end tests
- `pnpm` for package management

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 12+
- Supabase project for the full authentication and hosted-data flow
- Google Gemini API key for AI-generated content
- SMTP credentials if email verification and password-reset emails should be delivered

### Install and run

```bash
git clone https://github.com/JatinDhimanx/lectureMate.git
cd lectureMate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI generation
GEMINI_API_KEY=your-google-gemini-api-key
# Optional; defaults to gemini-2.0-flash-exp
GEMINI_MODEL=gemini-2.0-flash-exp

# Optional direct PostgreSQL connection for Drizzle tooling and seeding
DATABASE_URL=your-postgresql-connection-string

# Application signing secret
AUTH_SECRET=replace-with-a-long-random-secret

# Optional SMTP delivery
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=LectureMate <no-reply@example.com>
```

`GEMINI_API_KEY` is optional during development: without it, LectureMate uses its built-in deterministic generators. The repository also supports local filesystem persistence under `.data/` when hosted database persistence is unavailable. Do not commit `.env.local`, API keys, service-role keys, or SMTP passwords.

## Database setup

The Drizzle schema is defined in `db/schema.ts`, with tables for users, courses, lectures, sections, concepts, concept edges, cards, reviews, quiz questions, quiz attempts, and study sessions.

To generate or apply Drizzle migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

To validate and optionally seed the sample lecture:

```bash
pnpm db:seed
```

The seed command first verifies that sample flashcard evidence quotes occur verbatim in the sample transcript.

## Useful commands

```bash
pnpm dev          # Start the development server
pnpm build        # Create a production build
pnpm start        # Start the production server
pnpm lint         # Run ESLint
pnpm test         # Run unit tests
pnpm test:watch   # Run Vitest in watch mode
pnpm test:e2e     # Run Playwright end-to-end tests
```

## Project structure

```text
app/
  (dashboard)/       Authenticated dashboard, lecture, study, quiz, and map pages
  api/               Authentication, ingestion, lectures, reviews, and quiz endpoints
  auth/              Login, sign-up, verification, and password-reset pages
  page.tsx           Public landing page
components/          Shared UI and study components
db/
  schema.ts          Drizzle PostgreSQL schema
  seed.ts            Sample-data verification and database seeding
lib/
  ai/                Gemini provider and Zod generation schemas
  auth/              Current-user lookup, lockout, and signing helpers
  db/                Repository, persistence, and sample lecture data
  fsrs/              Scheduling and review queue helpers
  parsers/           PDF, Office, spreadsheet, subtitle, YouTube, and audio parsers
  pipeline/          Ingestion, cleaning, segmentation, extraction, generation, and verification
tests/
  unit/              Pipeline, parser, classifier, and FSRS tests
  e2e/               Navigation and study-session tests
```

## License

This project is distributed under the MIT License.
