import { pgTable, text, timestamp, integer, real, jsonb, boolean, uuid, index } from "drizzle-orm/pg-core";

// ==========================================
// USERS
// ==========================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    avatarUrl: text("avatar_url"),
    emailVerified: boolean("email_verified").default(false).notNull(),
    verificationToken: text("verification_token"),
    verificationExpiresAt: timestamp("verification_expires_at", { withTimezone: true }),
    resetToken: text("reset_token"),
    resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
    passwordResetAt: timestamp("password_reset_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_verification_token_idx").on(table.verificationToken),
    index("users_reset_token_idx").on(table.resetToken),
  ]
);

// ==========================================
// COURSES
// ==========================================
export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    color: text("color").default("#6366F1"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("courses_user_id_idx").on(table.userId),
  ]
);

// ==========================================
// LECTURES
// ==========================================
export const lectures = pgTable(
  "lectures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    sourceType: text("source_type").notNull(), // 'paste' | 'file' | 'youtube' | 'audio' | 'mic'
    sourceUrl: text("source_url"),
    rawTranscript: text("raw_transcript").notNull(),
    cleanTranscript: text("clean_transcript").notNull(),
    language: text("language").default("en").notNull(),
    originalLanguage: text("original_language").default("en").notNull(),
    wordCount: integer("word_count").default(0).notNull(),
    durationSeconds: integer("duration_seconds").default(0),
    status: text("status").default("ready").notNull(), // 'processing' | 'ready' | 'failed'
    qualityReport: jsonb("quality_report").$type<{
      totalGenerated: number;
      cardsKept: number;
      duplicatesRemoved: number;
      ungroundedDropped: number;
      averageGroundedness: number;
      averageClarity: number;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("lectures_user_id_idx").on(table.userId),
    index("lectures_course_id_idx").on(table.courseId),
    index("lectures_created_at_idx").on(table.createdAt),
  ]
);

// ==========================================
// SECTIONS
// ==========================================
export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    orderIndex: integer("order_index").notNull(),
    startChar: integer("start_char").notNull(),
    endChar: integer("end_char").notNull(),
    startTimeSeconds: real("start_time_seconds"),
    endTimeSeconds: real("end_time_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sections_lecture_id_idx").on(table.lectureId),
  ]
);

// ==========================================
// CONCEPTS
// ==========================================
export const concepts = pgTable(
  "concepts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    definition: text("definition").notNull(),
    importanceScore: real("importance_score").default(0.5).notNull(), // 0.0 - 1.0
    examCue: boolean("exam_cue").default(false).notNull(),
    masteryScore: real("mastery_score").default(0.0).notNull(), // 0.0 - 1.0 for node coloring
    sourceSpan: jsonb("source_span").$type<{
      startChar: number;
      endChar: number;
      quote: string;
      sectionIndex?: number;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("concepts_lecture_id_idx").on(table.lectureId),
    index("concepts_importance_idx").on(table.importanceScore),
  ]
);

// ==========================================
// CONCEPT EDGES (Graph Relationships)
// ==========================================
export const conceptEdges = pgTable(
  "concept_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id, { onDelete: "cascade" })
      .notNull(),
    sourceConceptId: uuid("source_concept_id")
      .references(() => concepts.id, { onDelete: "cascade" })
      .notNull(),
    targetConceptId: uuid("target_concept_id")
      .references(() => concepts.id, { onDelete: "cascade" })
      .notNull(),
    relationType: text("relation_type").default("prerequisite").notNull(), // 'prerequisite' | 'part_of' | 'extends'
  },
  (table) => [
    index("concept_edges_lecture_id_idx").on(table.lectureId),
  ]
);

// ==========================================
// FLASHCARDS
// ==========================================
export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id, { onDelete: "cascade" })
      .notNull(),
    conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    type: text("type").notNull(), // 'basic' | 'cloze' | 'why_how' | 'worked_example'
    front: text("front").notNull(),
    back: text("back").notNull(),
    bloomLevel: text("bloom_level").default("remember").notNull(), // 'remember' | 'understand' | 'apply' | 'analyze'
    difficulty: integer("difficulty").default(3).notNull(), // 1 - 5
    evidenceQuote: text("evidence_quote").notNull(),
    evidenceSpan: jsonb("evidence_span").$type<{
      startChar: number;
      endChar: number;
      startTimeSeconds?: number;
      endTimeSeconds?: number;
      sectionIndex?: number;
    }>().notNull(),
    qualityScores: jsonb("quality_scores").$type<{
      groundedness: number;
      clarity: number;
      uniqueness: number;
    }>(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    status: text("status").default("active").notNull(), // 'active' | 'discarded' | 'edited'

    // FSRS Spaced Repetition Parameters (ts-fsrs state)
    fsrsState: text("fsrs_state").default("New").notNull(), // 'New' | 'Learning' | 'Review' | 'Relearning'
    dueDate: timestamp("due_date", { withTimezone: true }).defaultNow().notNull(),
    stability: real("stability").default(0).notNull(),
    fsrsDifficulty: real("fsrs_difficulty").default(0).notNull(),
    elapsedDays: integer("elapsed_days").default(0).notNull(),
    scheduledDays: integer("scheduled_days").default(0).notNull(),
    reps: integer("reps").default(0).notNull(),
    lapses: integer("lapses").default(0).notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cards_due_date_idx").on(table.dueDate),
    index("cards_user_id_idx").on(table.userId),
    index("cards_lecture_id_idx").on(table.lectureId),
    index("cards_concept_id_idx").on(table.conceptId),
    index("cards_fsrs_state_idx").on(table.fsrsState),
  ]
);

// ==========================================
// QUIZ QUESTIONS
// ==========================================
export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id, { onDelete: "cascade" })
      .notNull(),
    conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "set null" }),
    questionType: text("question_type").notNull(), // 'mcq' | 'true_false' | 'short_answer'
    prompt: text("prompt").notNull(),
    correctAnswer: text("correct_answer").notNull(),
    options: jsonb("options").$type<
      Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        whyWrong?: string; // misconception explanation
      }>
    >().notNull(),
    explanation: text("explanation").notNull(),
    evidenceQuote: text("evidence_quote").notNull(),
    evidenceSpan: jsonb("evidence_span").$type<{
      startChar: number;
      endChar: number;
      startTimeSeconds?: number;
      endTimeSeconds?: number;
    }>(),
    bloomLevel: text("bloom_level").default("understand").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("quiz_questions_lecture_id_idx").on(table.lectureId),
  ]
);

// ==========================================
// REVIEWS (FSRS Review Logs)
// ==========================================
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .references(() => cards.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    rating: integer("rating").notNull(), // 1: Again, 2: Hard, 3: Good, 4: Easy
    reviewDurationMs: integer("review_duration_ms").default(0).notNull(),
    fsrsLog: jsonb("fsrs_log").$type<{
      state: string;
      stability: number;
      difficulty: number;
      due: string;
    }>(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_user_id_idx").on(table.userId),
    index("reviews_card_id_idx").on(table.cardId),
    index("reviews_reviewed_at_idx").on(table.reviewedAt),
  ]
);

// ==========================================
// QUIZ ATTEMPTS & ANALYTICS
// ==========================================
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    lectureId: uuid("lecture_id")
      .references(() => lectures.id, { onDelete: "cascade" })
      .notNull(),
    lectureTitle: text("lecture_title").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    scorePercent: real("score_percent").notNull(),
    timeSpentSeconds: integer("time_spent_seconds").notNull(),
    violationsCount: integer("violations_count").default(0).notNull(),
    terminated: boolean("terminated").default(false).notNull(),
    terminationReason: text("termination_reason"),
    selectedTopics: jsonb("selected_topics").$type<string[]>().default([]).notNull(),
    difficulty: text("difficulty").default("medium").notNull(),
    questionResults: jsonb("question_results").$type<
      Array<{
        questionId: string;
        prompt: string;
        selectedOptionId: string | null;
        correctOptionId: string;
        isCorrect: boolean;
        explanation: string;
        bloomLevel?: string;
      }>
    >().default([]).notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("quiz_attempts_user_id_idx").on(table.userId),
    index("quiz_attempts_lecture_id_idx").on(table.lectureId),
    index("quiz_attempts_attempted_at_idx").on(table.attemptedAt),
  ]
);

// ==========================================
// STUDY SESSIONS
// ==========================================
export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    lectureId: uuid("lecture_id").references(() => lectures.id, { onDelete: "set null" }),
    sessionType: text("session_type").notNull(), // 'flashcards' | 'quiz' | 'teach_back'
    cardsReviewed: integer("cards_reviewed").default(0).notNull(),
    quizScore: real("quiz_score"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("study_sessions_user_id_idx").on(table.userId),
    index("study_sessions_started_at_idx").on(table.startedAt),
  ]
);
