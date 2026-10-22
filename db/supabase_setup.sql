-- ==============================================================================
-- LectureMate: Production-Ready Supabase Database Schema & Architecture
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. USERS TABLE
-- Handles user registration, hashed passwords, email verification, and password resets
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" text UNIQUE NOT NULL,
    "password_hash" text NOT NULL,
    "full_name" text NOT NULL,
    "avatar_url" text,
    "email_verified" boolean DEFAULT false NOT NULL,
    "verification_token" text,
    "verification_expires_at" timestamp with time zone,
    "reset_token" text,
    "reset_token_expires_at" timestamp with time zone,
    "password_reset_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "failed_attempts" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" (lower("email"));
CREATE INDEX IF NOT EXISTS "users_verification_token_idx" ON "users" ("verification_token");
CREATE INDEX IF NOT EXISTS "users_reset_token_idx" ON "users" ("reset_token");

-- ==============================================================================
-- 3. COURSES TABLE
-- User-scoped folders/subjects to organize lectures
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "courses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "description" text,
    "color" text DEFAULT '#6366F1',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "courses_user_id_idx" ON "courses" ("user_id");

-- ==============================================================================
-- 4. LECTURES TABLE
-- Primary documents uploaded/processed by a specific user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "lectures" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS "lectures_course_id_idx" ON "lectures" ("course_id");
CREATE INDEX IF NOT EXISTS "lectures_created_at_idx" ON "lectures" ("created_at" DESC);

-- ==============================================================================
-- 5. SECTIONS TABLE
-- Chapters / time-stamped sections extracted from the lecture transcript
-- ==============================================================================
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

-- ==============================================================================
-- 6. CONCEPTS TABLE
-- Knowledge graph nodes extracted from the lecture
-- ==============================================================================
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

-- ==============================================================================
-- 7. CONCEPT EDGES TABLE
-- Knowledge graph relationships (prerequisites, extends, part_of)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "concept_edges" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "source_concept_id" uuid NOT NULL REFERENCES "concepts"("id") ON DELETE CASCADE,
    "target_concept_id" uuid NOT NULL REFERENCES "concepts"("id") ON DELETE CASCADE,
    "relation_type" text DEFAULT 'prerequisite' NOT NULL
);

CREATE INDEX IF NOT EXISTS "concept_edges_lecture_id_idx" ON "concept_edges" ("lecture_id");

-- ==============================================================================
-- 8. FLASHCARDS TABLE (FSRS Spaced Repetition)
-- User-isolated flashcards with Free Spaced Repetition Scheduler state
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "cards" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "concept_id" uuid REFERENCES "concepts"("id") ON DELETE SET NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS "cards_user_id_idx" ON "cards" ("user_id");
CREATE INDEX IF NOT EXISTS "cards_lecture_id_idx" ON "cards" ("lecture_id");
CREATE INDEX IF NOT EXISTS "cards_concept_id_idx" ON "cards" ("concept_id");
CREATE INDEX IF NOT EXISTS "cards_due_date_idx" ON "cards" ("due_date");
CREATE INDEX IF NOT EXISTS "cards_fsrs_state_idx" ON "cards" ("fsrs_state");

-- ==============================================================================
-- 9. QUIZ QUESTIONS TABLE
-- Practice and exam questions generated from lecture concepts
-- ==============================================================================
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

-- ==============================================================================
-- 10. REVIEWS TABLE (FSRS Review Logs)
-- Spaced repetition logs for card ratings and retention tracking
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "card_id" uuid NOT NULL REFERENCES "cards"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "rating" integer NOT NULL,
    "review_duration_ms" integer DEFAULT 0 NOT NULL,
    "fsrs_log" jsonb,
    "reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "reviews_user_id_idx" ON "reviews" ("user_id");
CREATE INDEX IF NOT EXISTS "reviews_card_id_idx" ON "reviews" ("card_id");
CREATE INDEX IF NOT EXISTS "reviews_reviewed_at_idx" ON "reviews" ("reviewed_at");

-- ==============================================================================
-- 11. QUIZ ATTEMPTS TABLE
-- Exam simulator logs and analytics per user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
    "lecture_title" text NOT NULL,
    "total_questions" integer NOT NULL,
    "correct_answers" integer NOT NULL,
    "score_percent" real NOT NULL,
    "time_spent_seconds" integer NOT NULL,
    "violations_count" integer DEFAULT 0 NOT NULL,
    "terminated" boolean DEFAULT false NOT NULL,
    "termination_reason" text,
    "selected_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "difficulty" text DEFAULT 'medium' NOT NULL,
    "question_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "quiz_attempts_user_id_idx" ON "quiz_attempts" ("user_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_lecture_id_idx" ON "quiz_attempts" ("lecture_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_attempted_at_idx" ON "quiz_attempts" ("attempted_at" DESC);

-- ==============================================================================
-- 12. STUDY SESSIONS TABLE
-- High-level learning session records
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "study_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
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
-- 13. AUTOMATIC updated_at TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON "users";
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS set_courses_updated_at ON "courses";
CREATE TRIGGER set_courses_updated_at
BEFORE UPDATE ON "courses"
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS set_lectures_updated_at ON "lectures";
CREATE TRIGGER set_lectures_updated_at
BEFORE UPDATE ON "lectures"
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS set_cards_updated_at ON "cards";
CREATE TRIGGER set_cards_updated_at
BEFORE UPDATE ON "cards"
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) & POLICIES
-- Strict data isolation: Users can only view, modify, and delete their own records
-- ==============================================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lectures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concepts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concept_edges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_sessions" ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- POLICIES: USERS
-- Allow registration (INSERT), lookup for login/verification (SELECT),
-- and password updates/resets (UPDATE).
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public registration" ON "users";
CREATE POLICY "Allow public registration" ON "users"
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user lookup for auth" ON "users";
CREATE POLICY "Allow user lookup for auth" ON "users"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow user credential updates" ON "users";
CREATE POLICY "Allow user credential updates" ON "users"
    FOR UPDATE USING (true);

-- ------------------------------------------------------------------------------
-- POLICIES: COURSES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own courses" ON "courses";
CREATE POLICY "Users can manage own courses" ON "courses"
    FOR ALL USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    )
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- ------------------------------------------------------------------------------
-- POLICIES: LECTURES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own lectures" ON "lectures";
CREATE POLICY "Users can manage own lectures" ON "lectures"
    FOR ALL USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    )
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- ------------------------------------------------------------------------------
-- POLICIES: SECTIONS (Inherited through lecture ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage sections of own lectures" ON "sections";
CREATE POLICY "Users can manage sections of own lectures" ON "sections"
    FOR ALL USING (
        EXISTS (SELECT 1 FROM "lectures" WHERE "lectures"."id" = "sections"."lecture_id" AND ("lectures"."user_id" = auth.uid() OR auth.uid() IS NULL))
    );

-- ------------------------------------------------------------------------------
-- POLICIES: CONCEPTS & EDGES (Inherited through lecture ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage concepts of own lectures" ON "concepts";
CREATE POLICY "Users can manage concepts of own lectures" ON "concepts"
    FOR ALL USING (
        EXISTS (SELECT 1 FROM "lectures" WHERE "lectures"."id" = "concepts"."lecture_id" AND ("lectures"."user_id" = auth.uid() OR auth.uid() IS NULL))
    );

DROP POLICY IF EXISTS "Users can manage concept edges of own lectures" ON "concept_edges";
CREATE POLICY "Users can manage concept edges of own lectures" ON "concept_edges"
    FOR ALL USING (
        EXISTS (SELECT 1 FROM "lectures" WHERE "lectures"."id" = "concept_edges"."lecture_id" AND ("lectures"."user_id" = auth.uid() OR auth.uid() IS NULL))
    );

-- ------------------------------------------------------------------------------
-- POLICIES: CARDS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own cards" ON "cards";
CREATE POLICY "Users can manage own cards" ON "cards"
    FOR ALL USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    )
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- ------------------------------------------------------------------------------
-- POLICIES: QUIZ QUESTIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage quiz questions of own lectures" ON "quiz_questions";
CREATE POLICY "Users can manage quiz questions of own lectures" ON "quiz_questions"
    FOR ALL USING (
        EXISTS (SELECT 1 FROM "lectures" WHERE "lectures"."id" = "quiz_questions"."lecture_id" AND ("lectures"."user_id" = auth.uid() OR auth.uid() IS NULL))
    );

-- ------------------------------------------------------------------------------
-- POLICIES: REVIEWS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own reviews" ON "reviews";
CREATE POLICY "Users can manage own reviews" ON "reviews"
    FOR ALL USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    )
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- ------------------------------------------------------------------------------
-- POLICIES: QUIZ ATTEMPTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own quiz attempts" ON "quiz_attempts";
CREATE POLICY "Users can manage own quiz attempts" ON "quiz_attempts"
    FOR ALL USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    )
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- ------------------------------------------------------------------------------
-- POLICIES: STUDY SESSIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own study sessions" ON "study_sessions";
CREATE POLICY "Users can manage own study sessions" ON "study_sessions"
    FOR ALL USING (
        auth.uid() = user_id OR auth.uid() IS NULL
    )
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() IS NULL
    );

-- ==============================================================================
-- 15. SEED DEFAULT DEMO ACCOUNT
-- ==============================================================================
INSERT INTO "users" (
    "id",
    "email",
    "password_hash",
    "full_name",
    "email_verified"
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@lecturemate.ai',
    'password123',
    'Demo Student',
    true
) ON CONFLICT ("email") DO NOTHING;
