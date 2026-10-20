-- ==============================================================================
-- LectureMate Supabase Database Setup & Schema
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. COURSES
CREATE TABLE IF NOT EXISTS "courses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "color" text DEFAULT '#6366F1',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. LECTURES
CREATE TABLE IF NOT EXISTS "lectures" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "course_id" uuid REFERENCES "courses"("id") ON DELETE SET NULL,
    "title" text NOT NULL,
    "source_type" text NOT NULL,
    "source_url" text,
    "raw_transcript" text NOT NULL,
    "clean_transcript" text NOT NULL,
    "language" text DEFAULT 'en' NOT NULL,
    "original_language" text DEFAULT 'en' NOT NULL,
    "word_count" integer DEFAULT 0 NOT NULL,
    "duration_seconds" integer DEFAULT 0,
    "status" text DEFAULT 'ready' NOT NULL,
    "quality_report" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "lectures_user_id_idx" ON "lectures" ("user_id");
CREATE INDEX IF NOT EXISTS "lectures_created_at_idx" ON "lectures" ("created_at");

-- 4. SECTIONS
CREATE TABLE IF NOT EXISTS "sections" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "summary" text NOT NULL,
    "order_index" integer NOT NULL,
    "start_char" integer NOT NULL,
    "end_char" integer NOT NULL,
    "start_time_seconds" real,
    "end_time_seconds" real,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sections_lecture_id_idx" ON "sections" ("lecture_id");

-- 5. CONCEPTS
CREATE TABLE IF NOT EXISTS "concepts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "definition" text NOT NULL,
    "importance_score" real DEFAULT 0.5 NOT NULL,
    "exam_cue" boolean DEFAULT false NOT NULL,
    "mastery_score" real DEFAULT 0 NOT NULL,
    "source_span" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "concepts_lecture_id_idx" ON "concepts" ("lecture_id");
CREATE INDEX IF NOT EXISTS "concepts_importance_idx" ON "concepts" ("importance_score");

-- 6. CONCEPT EDGES
CREATE TABLE IF NOT EXISTS "concept_edges" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "source_concept_id" uuid NOT NULL REFERENCES "concepts"("id") ON DELETE CASCADE,
    "target_concept_id" uuid NOT NULL REFERENCES "concepts"("id") ON DELETE CASCADE,
    "relation_type" text DEFAULT 'prerequisite' NOT NULL
);

CREATE INDEX IF NOT EXISTS "concept_edges_lecture_id_idx" ON "concept_edges" ("lecture_id");

-- 7. FLASHCARDS (FSRS Spaced Repetition)
CREATE TABLE IF NOT EXISTS "cards" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "concept_id" uuid REFERENCES "concepts"("id") ON DELETE SET NULL,
    "user_id" uuid NOT NULL,
    "type" text NOT NULL,
    "front" text NOT NULL,
    "back" text NOT NULL,
    "bloom_level" text DEFAULT 'remember' NOT NULL,
    "difficulty" integer DEFAULT 3 NOT NULL,
    "evidence_quote" text NOT NULL,
    "evidence_span" jsonb NOT NULL,
    "quality_scores" jsonb,
    "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "status" text DEFAULT 'active' NOT NULL,
    "fsrs_state" text DEFAULT 'New' NOT NULL,
    "due_date" timestamp with time zone DEFAULT now() NOT NULL,
    "stability" real DEFAULT 0 NOT NULL,
    "fsrs_difficulty" real DEFAULT 0 NOT NULL,
    "elapsed_days" integer DEFAULT 0 NOT NULL,
    "scheduled_days" integer DEFAULT 0 NOT NULL,
    "reps" integer DEFAULT 0 NOT NULL,
    "lapses" integer DEFAULT 0 NOT NULL,
    "last_review" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cards_due_date_idx" ON "cards" ("due_date");
CREATE INDEX IF NOT EXISTS "cards_user_id_idx" ON "cards" ("user_id");
CREATE INDEX IF NOT EXISTS "cards_lecture_id_idx" ON "cards" ("lecture_id");
CREATE INDEX IF NOT EXISTS "cards_concept_id_idx" ON "cards" ("concept_id");
CREATE INDEX IF NOT EXISTS "cards_fsrs_state_idx" ON "cards" ("fsrs_state");

-- 8. QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS "quiz_questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "concept_id" uuid REFERENCES "concepts"("id") ON DELETE SET NULL,
    "question_type" text NOT NULL,
    "prompt" text NOT NULL,
    "correct_answer" text NOT NULL,
    "options" jsonb NOT NULL,
    "explanation" text NOT NULL,
    "evidence_quote" text NOT NULL,
    "evidence_span" jsonb,
    "bloom_level" text DEFAULT 'understand' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "quiz_questions_lecture_id_idx" ON "quiz_questions" ("lecture_id");

-- 9. REVIEWS (FSRS Logs)
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "card_id" uuid NOT NULL REFERENCES "cards"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL,
    "rating" integer NOT NULL,
    "review_duration_ms" integer DEFAULT 0 NOT NULL,
    "fsrs_log" jsonb,
    "reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "reviews_user_id_idx" ON "reviews" ("user_id");
CREATE INDEX IF NOT EXISTS "reviews_card_id_idx" ON "reviews" ("card_id");
CREATE INDEX IF NOT EXISTS "reviews_reviewed_at_idx" ON "reviews" ("reviewed_at");

-- 10. STUDY SESSIONS
CREATE TABLE IF NOT EXISTS "study_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "lecture_id" uuid REFERENCES "lectures"("id") ON DELETE SET NULL,
    "session_type" text NOT NULL,
    "cards_reviewed" integer DEFAULT 0 NOT NULL,
    "quiz_score" real,
    "started_at" timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "study_sessions_user_id_idx" ON "study_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "study_sessions_started_at_idx" ON "study_sessions" ("started_at");

-- ==============================================================================
-- Row Level Security (RLS) Policies (Supabase Auth Integration)
-- ==============================================================================
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lectures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_sessions" ENABLE ROW LEVEL SECURITY;

-- Allow users to manage only their own data
CREATE POLICY "Users can manage own courses" ON "courses"
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own lectures" ON "lectures"
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cards" ON "cards"
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reviews" ON "reviews"
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own study sessions" ON "study_sessions"
    FOR ALL USING (auth.uid() = user_id);
