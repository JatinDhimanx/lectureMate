CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"concept_id" uuid,
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
--> statement-breakpoint
CREATE TABLE "concept_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"source_concept_id" uuid NOT NULL,
	"target_concept_id" uuid NOT NULL,
	"relation_type" text DEFAULT 'prerequisite' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"name" text NOT NULL,
	"definition" text NOT NULL,
	"importance_score" real DEFAULT 0.5 NOT NULL,
	"exam_cue" boolean DEFAULT false NOT NULL,
	"mastery_score" real DEFAULT 0 NOT NULL,
	"source_span" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366F1',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lectures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
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
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"concept_id" uuid,
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
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_duration_ms" integer DEFAULT 0 NOT NULL,
	"fsrs_log" jsonb,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"order_index" integer NOT NULL,
	"start_char" integer NOT NULL,
	"end_char" integer NOT NULL,
	"start_time_seconds" real,
	"end_time_seconds" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lecture_id" uuid,
	"session_type" text NOT NULL,
	"cards_reviewed" integer DEFAULT 0 NOT NULL,
	"quiz_score" real,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_edges" ADD CONSTRAINT "concept_edges_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_edges" ADD CONSTRAINT "concept_edges_source_concept_id_concepts_id_fk" FOREIGN KEY ("source_concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_edges" ADD CONSTRAINT "concept_edges_target_concept_id_concepts_id_fk" FOREIGN KEY ("target_concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_due_date_idx" ON "cards" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "cards_user_id_idx" ON "cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cards_lecture_id_idx" ON "cards" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "cards_concept_id_idx" ON "cards" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "cards_fsrs_state_idx" ON "cards" USING btree ("fsrs_state");--> statement-breakpoint
CREATE INDEX "concept_edges_lecture_id_idx" ON "concept_edges" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "concepts_lecture_id_idx" ON "concepts" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "concepts_importance_idx" ON "concepts" USING btree ("importance_score");--> statement-breakpoint
CREATE INDEX "lectures_user_id_idx" ON "lectures" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lectures_created_at_idx" ON "lectures" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quiz_questions_lecture_id_idx" ON "quiz_questions" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_card_id_idx" ON "reviews" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewed_at_idx" ON "reviews" USING btree ("reviewed_at");--> statement-breakpoint
CREATE INDEX "sections_lecture_id_idx" ON "sections" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "study_sessions_user_id_idx" ON "study_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "study_sessions_started_at_idx" ON "study_sessions" USING btree ("started_at");