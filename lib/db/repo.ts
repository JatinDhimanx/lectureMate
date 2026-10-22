import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { SAMPLE_LECTURE_DATA, DemoLectureData } from "./mock-data";
import { hashPassword, verifyPassword } from "@/lib/auth/security";
import { supabase } from "./client";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(val?: string | null): boolean {
  return !!val && UUID_REGEX.test(val);
}

export function toValidUuid(val?: string | null): string {
  if (!val || val === "demo-user-id" || val.includes("demo")) {
    return DEMO_USER_ID;
  }
  if (isUuid(val)) {
    return val;
  }
  const clean = val.replace(/[^0-9a-f]/gi, "").padEnd(32, "0").slice(0, 32);
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-4${clean.slice(13, 16)}-a${clean.slice(17, 20)}-${clean.slice(20, 32)}`;
}

export interface ReviewLog {
  id: string;
  userId?: string;
  cardId: string;
  rating: number; // 1-4
  reviewDurationMs: number;
  reviewedAt: string;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string; // Cryptographically hashed password
  fullName: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationExpiresAt?: string;
  resetToken?: string;
  resetTokenExpiresAt?: string;
  passwordResetAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizAttemptLog {
  id: string;
  userId?: string;
  lectureId: string;
  lectureTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  timeSpentSeconds: number;
  violationsCount: number;
  terminated: boolean;
  terminationReason?: string;
  selectedTopics: string[];
  difficulty: "easy" | "medium" | "hard";
  attemptedAt: string;
  questionResults: Array<{
    questionId: string;
    prompt: string;
    selectedOptionId: string | null;
    correctOptionId: string;
    isCorrect: boolean;
    explanation: string;
    bloomLevel?: string;
  }>;
}

// Global in-memory storage preserved across Next.js dev server hot-module-reloads
const globalForRepo = globalThis as unknown as {
  lectureStore: Map<string, DemoLectureData>;
  reviewLogs: ReviewLog[];
  userStore: Map<string, UserAccount>;
  quizAttempts: QuizAttemptLog[];
};

const lectureStore: Map<string, DemoLectureData> =
  globalForRepo.lectureStore || (globalForRepo.lectureStore = new Map());
const reviewLogs: ReviewLog[] =
  globalForRepo.reviewLogs || (globalForRepo.reviewLogs = []);
const userStore: Map<string, UserAccount> =
  globalForRepo.userStore || (globalForRepo.userStore = new Map());
const quizAttempts: QuizAttemptLog[] =
  globalForRepo.quizAttempts || (globalForRepo.quizAttempts = []);

// Local filesystem persistence directory (uses /tmp on Vercel/serverless environments)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), "lecturemate_data")
  : path.join(process.cwd(), ".data");
const LECTURES_DIR = path.join(DATA_DIR, "lectures");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");
const QUIZ_ATTEMPTS_FILE = path.join(DATA_DIR, "quiz_attempts.json");

function ensureDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LECTURES_DIR)) {
      fs.mkdirSync(LECTURES_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[repo] Could not create storage directory:", err);
  }
}

function loadLectureFromDisk(id: string): DemoLectureData | null {
  try {
    ensureDirs();
    const filePath = path.join(LECTURES_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content) as DemoLectureData;
      if (data && data.id) {
        lectureStore.set(data.id, data);
        return data;
      }
    }
  } catch (err) {
    console.warn(`[repo] Error loading lecture ${id} from disk:`, err);
  }
  return null;
}

function saveLectureToDisk(lecture: DemoLectureData) {
  try {
    ensureDirs();
    const filePath = path.join(LECTURES_DIR, `${lecture.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(lecture, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[repo] Error saving lecture ${lecture.id} to disk:`, err);
  }
}

function deleteLectureFromDisk(id: string) {
  try {
    const filePath = path.join(LECTURES_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[repo] Error deleting lecture ${id} from disk:`, err);
  }
}

function loadAllLecturesFromDisk(): DemoLectureData[] {
  try {
    ensureDirs();
    if (fs.existsSync(LECTURES_DIR)) {
      const files = fs.readdirSync(LECTURES_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = path.join(LECTURES_DIR, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const lecture = JSON.parse(content) as DemoLectureData;
            if (lecture && lecture.id) {
              if (!lecture.createdAt) {
                const stat = fs.statSync(filePath);
                lecture.createdAt = stat.mtime.toISOString();
              }
              lectureStore.set(lecture.id, lecture);
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("[repo] Error scanning lectures directory:", err);
  }
  return Array.from(lectureStore.values());
}

function loadUsersFromDisk() {
  try {
    ensureDirs();
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, "utf-8");
      const list = JSON.parse(content) as UserAccount[];
      if (Array.isArray(list)) {
        for (const u of list) {
          userStore.set(u.email.toLowerCase().trim(), u);
        }
      }
    }
  } catch (err) {
    console.warn("[repo] Error loading users from disk:", err);
  }
}

function saveUsersToDisk() {
  try {
    ensureDirs();
    const list = Array.from(userStore.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[repo] Error saving users to disk:", err);
  }
}

function loadReviewsFromDisk() {
  try {
    ensureDirs();
    if (fs.existsSync(REVIEWS_FILE)) {
      const content = fs.readFileSync(REVIEWS_FILE, "utf-8");
      const list = JSON.parse(content) as ReviewLog[];
      if (Array.isArray(list)) {
        reviewLogs.length = 0;
        reviewLogs.push(...list);
      }
    }
  } catch (err) {
    console.warn("[repo] Error loading reviews from disk:", err);
  }
}

function loadQuizAttemptsFromDisk() {
  try {
    ensureDirs();
    if (fs.existsSync(QUIZ_ATTEMPTS_FILE)) {
      const content = fs.readFileSync(QUIZ_ATTEMPTS_FILE, "utf-8");
      const list = JSON.parse(content) as QuizAttemptLog[];
      if (Array.isArray(list)) {
        quizAttempts.length = 0;
        quizAttempts.push(...list);
      }
    }
  } catch (err) {
    console.warn("[repo] Error loading quiz attempts from disk:", err);
  }
}

function saveReviewsToDisk() {
  try {
    ensureDirs();
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviewLogs, null, 2), "utf-8");
  } catch (err) {
    console.warn("[repo] Error saving reviews to disk:", err);
  }
}

function saveQuizAttemptsToDisk() {
  try {
    ensureDirs();
    fs.writeFileSync(QUIZ_ATTEMPTS_FILE, JSON.stringify(quizAttempts, null, 2), "utf-8");
  } catch (err) {
    console.warn("[repo] Error saving quiz attempts to disk:", err);
  }
}

// Initial hydration from disk
ensureDirs();
loadUsersFromDisk();
loadReviewsFromDisk();
loadQuizAttemptsFromDisk();
loadAllLecturesFromDisk();

// Seed sample lecture for demo session if empty
if (!lectureStore.has(SAMPLE_LECTURE_DATA.id)) {
  const sample = JSON.parse(JSON.stringify(SAMPLE_LECTURE_DATA)) as DemoLectureData;
  sample.userId = DEMO_USER_ID;
  lectureStore.set(sample.id, sample);
  saveLectureToDisk(sample);
}

// Seed default demo user if empty
if (!userStore.has("demo@lecturemate.ai")) {
  userStore.set("demo@lecturemate.ai", {
    id: DEMO_USER_ID,
    email: "demo@lecturemate.ai",
    passwordHash: "password123",
    fullName: "Demo Student",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });
  saveUsersToDisk();
}

function mapSupabaseUser(row: Record<string, unknown>): UserAccount {
  return {
    id: String(row.id),
    email: String(row.email).toLowerCase().trim(),
    passwordHash: String(row.password_hash || ""),
    fullName: String(row.full_name || ""),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    emailVerified: Boolean(row.email_verified),
    verificationToken: row.verification_token ? String(row.verification_token) : undefined,
    verificationExpiresAt: row.verification_expires_at ? String(row.verification_expires_at) : undefined,
    resetToken: row.reset_token ? String(row.reset_token) : undefined,
    resetTokenExpiresAt: row.reset_token_expires_at ? String(row.reset_token_expires_at) : undefined,
    passwordResetAt: row.password_reset_at ? String(row.password_reset_at) : undefined,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export const repo = {
  // ==========================================
  // USER ACCOUNTS (SUPABASE + LOCAL PERSISTENCE)
  // ==========================================
  registerUser: async (user: {
    email: string;
    password: string;
    fullName?: string;
    emailVerified?: boolean;
    verificationToken?: string;
  }): Promise<UserAccount> => {
    const emailKey = user.email.toLowerCase().trim();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(user.password);
    const fullName = user.fullName || emailKey.split("@")[0];
    const emailVerified = user.emailVerified ?? false;
    const verificationToken = user.verificationToken;
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const account: UserAccount = {
      id,
      email: emailKey,
      passwordHash,
      fullName,
      emailVerified,
      verificationToken,
      verificationExpiresAt,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Insert directly into Supabase PostgreSQL users table
    try {
      const { error } = await supabase.from("users").insert({
        id,
        email: emailKey,
        password_hash: passwordHash,
        full_name: fullName,
        email_verified: emailVerified,
        verification_token: verificationToken || null,
        verification_expires_at: verificationExpiresAt,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        console.warn("[repo] Supabase insert user note:", error.message);
      }
    } catch (err) {
      console.warn("[repo] Supabase register error:", err);
    }

    // 2. Cache in memory and local filesystem
    userStore.set(emailKey, account);
    saveUsersToDisk();
    return account;
  },

  createVerificationToken: async (email: string): Promise<string> => {
    const emailKey = email.toLowerCase().trim();
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // 1. Update Supabase users table
    try {
      await supabase
        .from("users")
        .update({
          verification_token: token,
          verification_expires_at: expiresAt,
          updated_at: now,
        })
        .ilike("email", emailKey);
    } catch (err) {
      console.warn("[repo] Supabase update verification token error:", err);
    }

    // 2. Update local cache
    loadUsersFromDisk();
    const account = userStore.get(emailKey);
    if (account) {
      account.verificationToken = token;
      account.verificationExpiresAt = expiresAt;
      account.updatedAt = now;
      userStore.set(emailKey, account);
      saveUsersToDisk();
    }

    return token;
  },

  verifyEmailByToken: async (email: string, token: string): Promise<boolean> => {
    const emailKey = email.toLowerCase().trim();
    const cleanToken = token.trim();
    const now = new Date().toISOString();

    // 1. Check Supabase
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .ilike("email", emailKey)
        .maybeSingle();

      if (data && data.verification_token === cleanToken) {
        await supabase
          .from("users")
          .update({
            email_verified: true,
            verification_token: null,
            verification_expires_at: null,
            updated_at: now,
          })
          .eq("id", data.id);

        // Update local cache
        const mapped = mapSupabaseUser(data);
        mapped.emailVerified = true;
        mapped.verificationToken = undefined;
        userStore.set(emailKey, mapped);
        saveUsersToDisk();
        return true;
      }
    } catch (err) {
      console.warn("[repo] Supabase verifyEmail error:", err);
    }

    // 2. Fallback check in local cache
    loadUsersFromDisk();
    const account = userStore.get(emailKey);
    if (account && account.verificationToken === cleanToken) {
      account.emailVerified = true;
      account.verificationToken = undefined;
      account.verificationExpiresAt = undefined;
      account.updatedAt = now;
      userStore.set(emailKey, account);
      saveUsersToDisk();
      return true;
    }

    return false;
  },

  createResetToken: async (email: string): Promise<string | null> => {
    const emailKey = email.toLowerCase().trim();
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const now = new Date().toISOString();

    // 1. Update Supabase users table
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          reset_token: token,
          reset_token_expires_at: expiresAt,
          updated_at: now,
        })
        .ilike("email", emailKey)
        .select("id");

      if (error) {
        console.warn("[repo] Supabase createResetToken error:", error.message);
      } else if (data && data.length > 0) {
        // Also update local cache
        const account = userStore.get(emailKey);
        if (account) {
          account.resetToken = token;
          account.resetTokenExpiresAt = expiresAt;
          account.updatedAt = now;
          userStore.set(emailKey, account);
          saveUsersToDisk();
        }
        return token;
      }
    } catch (err) {
      console.warn("[repo] Supabase createResetToken exception:", err);
    }

    // 2. Fallback to local cache
    loadUsersFromDisk();
    const account = userStore.get(emailKey);
    if (!account) return null;
    account.resetToken = token;
    account.resetTokenExpiresAt = expiresAt;
    account.updatedAt = now;
    userStore.set(emailKey, account);
    saveUsersToDisk();
    return token;
  },

  verifyResetToken: async (email: string, token: string): Promise<boolean> => {
    const emailKey = email.toLowerCase().trim();
    const cleanToken = token.trim();

    // 1. Check Supabase first
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .ilike("email", emailKey)
        .maybeSingle();

      if (data && data.reset_token === cleanToken) {
        if (data.reset_token_expires_at && new Date(data.reset_token_expires_at).getTime() < Date.now()) {
          return false;
        }
        return true;
      }
    } catch (err) {
      console.warn("[repo] Supabase verifyResetToken error:", err);
    }

    // 2. Fallback to local cache
    loadUsersFromDisk();
    const account = userStore.get(emailKey);
    if (!account || !account.resetToken) return false;
    if (account.resetTokenExpiresAt && new Date(account.resetTokenExpiresAt).getTime() < Date.now()) {
      return false;
    }
    return account.resetToken === cleanToken;
  },

  findUserByEmail: async (email: string): Promise<UserAccount | null> => {
    const emailKey = email.toLowerCase().trim();

    // 1. Query Supabase users table
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", emailKey)
        .maybeSingle();

      if (data && !error) {
        const mapped = mapSupabaseUser(data);
        userStore.set(emailKey, mapped);
        saveUsersToDisk();
        return mapped;
      }
    } catch (err) {
      console.warn("[repo] Supabase findUserByEmail error:", err);
    }

    // 2. Fallback to local cache
    loadUsersFromDisk();
    const account = userStore.get(emailKey);
    return account ? JSON.parse(JSON.stringify(account)) : null;
  },

  findUserById: async (id: string): Promise<UserAccount | null> => {
    // 1. Query Supabase
    try {
      if (isUuid(id)) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (data && !error) {
          const mapped = mapSupabaseUser(data);
          userStore.set(mapped.email, mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn("[repo] Supabase findUserById error:", err);
    }

    // 2. Fallback to local cache
    loadUsersFromDisk();
    for (const acc of userStore.values()) {
      if (acc.id === id) {
        return JSON.parse(JSON.stringify(acc));
      }
    }
    return null;
  },

  verifyUserPassword: async (email: string, password: string): Promise<UserAccount | null> => {
    const emailKey = email.toLowerCase().trim();
    // Fetch from Supabase (or fallback cache)
    const user = await repo.findUserByEmail(emailKey);
    if (!user) return null;

    if (verifyPassword(password, user.passwordHash)) {
      const now = new Date().toISOString();
      user.lastLoginAt = now;
      userStore.set(emailKey, user);
      saveUsersToDisk();

      // Update last_login_at in Supabase
      try {
        await supabase
          .from("users")
          .update({ last_login_at: now })
          .ilike("email", emailKey);
      } catch (err) {
        console.warn("[repo] Supabase update last_login_at error:", err);
      }

      return JSON.parse(JSON.stringify(user));
    }
    return null;
  },

  updateUserPassword: async (email: string, newPassword: string): Promise<boolean> => {
    const emailKey = email.toLowerCase().trim();
    const now = new Date().toISOString();
    const hashed = hashPassword(newPassword);

    // 1. Update Supabase users table directly
    let supabaseSuccess = false;
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          password_hash: hashed,
          password_reset_at: now,
          reset_token: null,
          reset_token_expires_at: null,
          updated_at: now,
        })
        .ilike("email", emailKey)
        .select("id");

      if (!error && data && data.length > 0) {
        supabaseSuccess = true;
      }
    } catch (err) {
      console.warn("[repo] Supabase updateUserPassword error:", err);
    }

    // 2. Update local cache
    loadUsersFromDisk();
    const account = userStore.get(emailKey);
    if (account) {
      account.passwordHash = hashed;
      account.passwordResetAt = now;
      account.resetToken = undefined;
      account.resetTokenExpiresAt = undefined;
      account.updatedAt = now;
      userStore.set(emailKey, account);
      saveUsersToDisk();
      return true;
    } else if (supabaseSuccess) {
      userStore.set(emailKey, {
        id: crypto.randomUUID(),
        email: emailKey,
        passwordHash: hashed,
        fullName: emailKey.split("@")[0],
        passwordResetAt: now,
        createdAt: now,
        updatedAt: now,
      });
      saveUsersToDisk();
      return true;
    }

    return supabaseSuccess;
  },

  // ==========================================
  // LECTURES (USER ISOLATED)
  // ==========================================
  getLectures: async (userId?: string): Promise<DemoLectureData[]> => {
    const safeUserId = toValidUuid(userId);

    // 1. Try querying Supabase lectures table
    try {
      let query = supabase.from("lectures").select("*").order("created_at", { ascending: false });

      if (safeUserId === DEMO_USER_ID) {
        query = query.or(`user_id.eq.${DEMO_USER_ID},user_id.is.null`);
      } else {
        query = query.eq("user_id", safeUserId);
      }

      const { data: dbLectures, error } = await query;

      if (!error && dbLectures && dbLectures.length > 0) {
        const assembled: DemoLectureData[] = [];

        for (const l of dbLectures) {
          // Fetch child entities for full lecture experience
          const [secRes, conRes, edgeRes, cardRes, qRes] = await Promise.all([
            supabase.from("sections").select("*").eq("lecture_id", l.id).order("order_index", { ascending: true }),
            supabase.from("concepts").select("*").eq("lecture_id", l.id),
            supabase.from("concept_edges").select("*").eq("lecture_id", l.id),
            supabase.from("cards").select("*").eq("lecture_id", l.id),
            supabase.from("quiz_questions").select("*").eq("lecture_id", l.id),
          ]);

          assembled.push({
            id: l.id,
            userId: l.user_id,
            createdAt: l.created_at,
            title: l.title,
            sourceType: l.source_type,
            sourceUrl: l.source_url || undefined,
            rawTranscript: l.raw_transcript,
            cleanTranscript: l.clean_transcript,
            language: l.language,
            wordCount: l.word_count,
            durationSeconds: l.duration_seconds || 0,
            qualityReport: l.quality_report || {
              totalGenerated: cardRes.data?.length || 0,
              cardsKept: cardRes.data?.length || 0,
              duplicatesRemoved: 0,
              ungroundedDropped: 0,
              averageGroundedness: 0.95,
              averageClarity: 0.95,
            },
            sections: (secRes.data || []).map((s) => ({
              id: s.id,
              title: s.title,
              summary: s.summary,
              orderIndex: s.order_index,
              startChar: s.start_char,
              endChar: s.end_char,
              startTimeSeconds: s.start_time_seconds || 0,
              endTimeSeconds: s.end_time_seconds || 0,
            })),
            concepts: (conRes.data || []).map((c) => ({
              id: c.id,
              name: c.name,
              definition: c.definition,
              importanceScore: c.importance_score,
              examCue: c.exam_cue,
              masteryScore: c.mastery_score,
              sourceSpan: c.source_span || { startChar: 0, endChar: 0, quote: "" },
            })),
            conceptEdges: (edgeRes.data || []).map((e) => ({
              id: e.id,
              sourceConceptId: e.source_concept_id,
              targetConceptId: e.target_concept_id,
              relationType: e.relation_type,
            })),
            cards: (cardRes.data || []).map((c) => ({
              id: c.id,
              conceptId: c.concept_id,
              type: c.type,
              front: c.front,
              back: c.back,
              bloomLevel: c.bloom_level,
              difficulty: c.difficulty,
              evidenceQuote: c.evidence_quote,
              evidenceSpan: c.evidence_span,
              qualityScores: c.quality_scores,
              tags: c.tags || [],
              fsrsState: c.fsrs_state,
              dueDate: c.due_date,
              stability: c.stability,
              fsrsDifficulty: c.fsrs_difficulty,
              elapsedDays: c.elapsed_days,
              scheduledDays: c.scheduled_days,
              reps: c.reps,
              lapses: c.lapses,
            })),
            quizQuestions: (qRes.data || []).map((q) => ({
              id: q.id,
              conceptId: q.concept_id,
              questionType: q.question_type,
              prompt: q.prompt,
              correctAnswer: q.correct_answer,
              options: q.options,
              explanation: q.explanation,
              evidenceQuote: q.evidence_quote,
              evidenceSpan: q.evidence_span,
              bloomLevel: q.bloom_level,
            })),
          });
        }

        return assembled;
      }
    } catch (err) {
      console.warn("[repo] Supabase getLectures error:", err);
    }

    // 2. Fallback to local store
    const all = loadAllLecturesFromDisk();
    let result: DemoLectureData[];

    if (!userId || userId === "demo-user-id" || userId.includes("demo")) {
      result = all.filter((l) => l.userId === "demo-user-id" || l.userId === DEMO_USER_ID || !l.userId);
    } else {
      result = all.filter((l) => l.userId === userId || l.userId === safeUserId);
    }

    return result.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  },

  getLectureById: async (id: string, userId?: string): Promise<DemoLectureData | null> => {
    if (!id || id === "undefined") return null;
    const safeUserId = toValidUuid(userId);

    // 1. Try Supabase
    try {
      if (isUuid(id)) {
        const { data: l, error } = await supabase.from("lectures").select("*").eq("id", id).maybeSingle();

        if (!error && l) {
          // Ownership check
          if (userId && l.user_id && l.user_id !== safeUserId && safeUserId !== DEMO_USER_ID && l.user_id !== DEMO_USER_ID) {
            return null; // Restricted by user isolation
          }

          const [secRes, conRes, edgeRes, cardRes, qRes] = await Promise.all([
            supabase.from("sections").select("*").eq("lecture_id", l.id).order("order_index", { ascending: true }),
            supabase.from("concepts").select("*").eq("lecture_id", l.id),
            supabase.from("concept_edges").select("*").eq("lecture_id", l.id),
            supabase.from("cards").select("*").eq("lecture_id", l.id),
            supabase.from("quiz_questions").select("*").eq("lecture_id", l.id),
          ]);

          return {
            id: l.id,
            userId: l.user_id,
            createdAt: l.created_at,
            title: l.title,
            sourceType: l.source_type,
            sourceUrl: l.source_url || undefined,
            rawTranscript: l.raw_transcript,
            cleanTranscript: l.clean_transcript,
            language: l.language,
            wordCount: l.word_count,
            durationSeconds: l.duration_seconds || 0,
            qualityReport: l.quality_report || {
              totalGenerated: cardRes.data?.length || 0,
              cardsKept: cardRes.data?.length || 0,
              duplicatesRemoved: 0,
              ungroundedDropped: 0,
              averageGroundedness: 0.95,
              averageClarity: 0.95,
            },
            sections: (secRes.data || []).map((s) => ({
              id: s.id,
              title: s.title,
              summary: s.summary,
              orderIndex: s.order_index,
              startChar: s.start_char,
              endChar: s.end_char,
              startTimeSeconds: s.start_time_seconds || 0,
              endTimeSeconds: s.end_time_seconds || 0,
            })),
            concepts: (conRes.data || []).map((c) => ({
              id: c.id,
              name: c.name,
              definition: c.definition,
              importanceScore: c.importance_score,
              examCue: c.exam_cue,
              masteryScore: c.mastery_score,
              sourceSpan: c.source_span || { startChar: 0, endChar: 0, quote: "" },
            })),
            conceptEdges: (edgeRes.data || []).map((e) => ({
              id: e.id,
              sourceConceptId: e.source_concept_id,
              targetConceptId: e.target_concept_id,
              relationType: e.relation_type,
            })),
            cards: (cardRes.data || []).map((c) => ({
              id: c.id,
              conceptId: c.concept_id,
              type: c.type,
              front: c.front,
              back: c.back,
              bloomLevel: c.bloom_level,
              difficulty: c.difficulty,
              evidenceQuote: c.evidence_quote,
              evidenceSpan: c.evidence_span,
              qualityScores: c.quality_scores,
              tags: c.tags || [],
              fsrsState: c.fsrs_state,
              dueDate: c.due_date,
              stability: c.stability,
              fsrsDifficulty: c.fsrs_difficulty,
              elapsedDays: c.elapsed_days,
              scheduledDays: c.scheduled_days,
              reps: c.reps,
              lapses: c.lapses,
            })),
            quizQuestions: (qRes.data || []).map((q) => ({
              id: q.id,
              conceptId: q.concept_id,
              questionType: q.question_type,
              prompt: q.prompt,
              correctAnswer: q.correct_answer,
              options: q.options,
              explanation: q.explanation,
              evidenceQuote: q.evidence_quote,
              evidenceSpan: q.evidence_span,
              bloomLevel: q.bloom_level,
            })),
          };
        }
      }
    } catch (err) {
      console.warn("[repo] Supabase getLectureById error:", err);
    }

    // 2. Fallback to local store
    let lecture = lectureStore.get(id) || loadLectureFromDisk(id) || null;
    if (!lecture) return null;

    if (userId && lecture.userId && lecture.userId !== userId && lecture.userId !== safeUserId) {
      if (lecture.userId === DEMO_USER_ID || safeUserId === DEMO_USER_ID) {
        return JSON.parse(JSON.stringify(lecture));
      }
      return null;
    }

    return JSON.parse(JSON.stringify(lecture));
  },

  saveLecture: async (data: DemoLectureData, userId?: string): Promise<DemoLectureData> => {
    const lectureId = isUuid(data.id) ? data.id : crypto.randomUUID();
    const safeUserId = toValidUuid(userId || data.userId);
    const now = new Date().toISOString();

    const toSave: DemoLectureData = {
      ...JSON.parse(JSON.stringify(data)),
      id: lectureId,
      userId: safeUserId,
      createdAt: data.createdAt || now,
    };

    // 1. Sync to Supabase PostgreSQL
    try {
      // Upsert lecture row
      await supabase.from("lectures").upsert({
        id: lectureId,
        user_id: safeUserId,
        title: toSave.title,
        source_type: toSave.sourceType,
        source_url: toSave.sourceUrl || null,
        raw_transcript: toSave.rawTranscript,
        clean_transcript: toSave.cleanTranscript,
        language: toSave.language || "en",
        word_count: toSave.wordCount || 0,
        duration_seconds: toSave.durationSeconds || 0,
        status: "ready",
        quality_report: toSave.qualityReport || null,
        created_at: toSave.createdAt,
        updated_at: now,
      });

      // Upsert sections
      if (toSave.sections && toSave.sections.length > 0) {
        const secRows = toSave.sections.map((s, idx) => ({
          id: isUuid(s.id) ? s.id : crypto.randomUUID(),
          lecture_id: lectureId,
          title: s.title,
          summary: s.summary,
          order_index: typeof s.orderIndex === "number" ? s.orderIndex : idx,
          start_char: s.startChar || 0,
          end_char: s.endChar || 0,
          start_time_seconds: s.startTimeSeconds || 0,
          end_time_seconds: s.endTimeSeconds || 0,
          created_at: now,
        }));
        await supabase.from("sections").upsert(secRows);
      }

      // Upsert concepts
      const conceptIdMap = new Map<string, string>();
      if (toSave.concepts && toSave.concepts.length > 0) {
        const conRows = toSave.concepts.map((c) => {
          const validConId = isUuid(c.id) ? c.id : crypto.randomUUID();
          conceptIdMap.set(c.id, validConId);
          return {
            id: validConId,
            lecture_id: lectureId,
            name: c.name,
            definition: c.definition,
            importance_score: c.importanceScore ?? 0.5,
            exam_cue: Boolean(c.examCue),
            mastery_score: c.masteryScore ?? 0,
            source_span: c.sourceSpan || null,
            created_at: now,
          };
        });
        await supabase.from("concepts").upsert(conRows);
      }

      // Upsert concept edges
      if (toSave.conceptEdges && toSave.conceptEdges.length > 0) {
        const edgeRows = toSave.conceptEdges.map((e) => ({
          id: isUuid(e.id) ? e.id : crypto.randomUUID(),
          lecture_id: lectureId,
          source_concept_id: conceptIdMap.get(e.sourceConceptId) || toValidUuid(e.sourceConceptId),
          target_concept_id: conceptIdMap.get(e.targetConceptId) || toValidUuid(e.targetConceptId),
          relation_type: e.relationType || "prerequisite",
        }));
        await supabase.from("concept_edges").upsert(edgeRows);
      }

      // Upsert cards (flashcards)
      if (toSave.cards && toSave.cards.length > 0) {
        const cardRows = toSave.cards.map((c) => ({
          id: isUuid(c.id) ? c.id : crypto.randomUUID(),
          lecture_id: lectureId,
          concept_id: c.conceptId ? conceptIdMap.get(c.conceptId) || (isUuid(c.conceptId) ? c.conceptId : null) : null,
          user_id: safeUserId,
          type: c.type,
          front: c.front,
          back: c.back,
          bloom_level: c.bloomLevel || "remember",
          difficulty: c.difficulty || 3,
          evidence_quote: c.evidenceQuote || "",
          evidence_span: c.evidenceSpan || {},
          quality_scores: c.qualityScores || null,
          tags: c.tags || [],
          status: "active",
          fsrs_state: c.fsrsState || "New",
          due_date: c.dueDate || now,
          stability: c.stability || 0,
          fsrs_difficulty: c.fsrsDifficulty || 0,
          elapsed_days: c.elapsedDays || 0,
          scheduled_days: c.scheduledDays || 0,
          reps: c.reps || 0,
          lapses: c.lapses || 0,
          created_at: now,
          updated_at: now,
        }));
        await supabase.from("cards").upsert(cardRows);
      }

      // Upsert quiz questions
      if (toSave.quizQuestions && toSave.quizQuestions.length > 0) {
        const qRows = toSave.quizQuestions.map((q) => ({
          id: isUuid(q.id) ? q.id : crypto.randomUUID(),
          lecture_id: lectureId,
          concept_id: q.conceptId ? conceptIdMap.get(q.conceptId) || (isUuid(q.conceptId) ? q.conceptId : null) : null,
          question_type: q.questionType,
          prompt: q.prompt,
          correct_answer: q.correctAnswer,
          options: q.options || [],
          explanation: q.explanation || "",
          evidence_quote: q.evidenceQuote || "",
          evidence_span: q.evidenceSpan || null,
          bloom_level: q.bloomLevel || "understand",
          created_at: now,
        }));
        await supabase.from("quiz_questions").upsert(qRows);
      }
    } catch (err) {
      console.warn("[repo] Supabase saveLecture error:", err);
    }

    // 2. Local persistence
    lectureStore.set(toSave.id, toSave);
    saveLectureToDisk(toSave);
    return toSave;
  },

  deleteLecture: async (id: string, userId?: string): Promise<boolean> => {
    const safeUserId = toValidUuid(userId);

    // 1. Delete from Supabase
    try {
      if (isUuid(id)) {
        await supabase
          .from("lectures")
          .delete()
          .eq("id", id)
          .eq("user_id", safeUserId);
      }
    } catch (err) {
      console.warn("[repo] Supabase deleteLecture error:", err);
    }

    // 2. Delete from local cache
    const lecture = lectureStore.get(id) || loadLectureFromDisk(id);
    if (!lecture) return false;
    if (userId && lecture.userId && lecture.userId !== userId && lecture.userId !== safeUserId && safeUserId !== DEMO_USER_ID) {
      return false;
    }
    lectureStore.delete(id);
    deleteLectureFromDisk(id);
    return true;
  },

  // ==========================================
  // CARDS & FLASHCARDS (USER ISOLATED)
  // ==========================================
  getCardsDueToday: async (userId?: string): Promise<DemoLectureData["cards"]> => {
    const userLectures = await repo.getLectures(userId);
    const now = new Date();
    const allCards: DemoLectureData["cards"] = [];

    for (const l of userLectures) {
      for (const c of l.cards) {
        if (new Date(c.dueDate) <= now || c.fsrsState === "New") {
          allCards.push(c);
        }
      }
    }
    return allCards;
  },

  getAllCards: async (userId?: string): Promise<DemoLectureData["cards"]> => {
    const userLectures = await repo.getLectures(userId);
    const allCards: DemoLectureData["cards"] = [];
    for (const l of userLectures) {
      allCards.push(...l.cards);
    }
    return allCards;
  },

  updateCard: async (
    lectureId: string,
    cardId: string,
    updates: Partial<DemoLectureData["cards"][0]>
  ): Promise<DemoLectureData["cards"][0] | null> => {
    // 1. Update Supabase
    try {
      if (isUuid(cardId)) {
        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.front !== undefined) dbUpdates.front = updates.front;
        if (updates.back !== undefined) dbUpdates.back = updates.back;
        if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
        if (updates.bloomLevel !== undefined) dbUpdates.bloom_level = updates.bloomLevel;
        if (updates.fsrsState !== undefined) dbUpdates.fsrs_state = updates.fsrsState;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.stability !== undefined) dbUpdates.stability = updates.stability;
        if (updates.fsrsDifficulty !== undefined) dbUpdates.fsrs_difficulty = updates.fsrsDifficulty;
        if (updates.elapsedDays !== undefined) dbUpdates.elapsed_days = updates.elapsedDays;
        if (updates.scheduledDays !== undefined) dbUpdates.scheduled_days = updates.scheduledDays;
        if (updates.reps !== undefined) dbUpdates.reps = updates.reps;
        if (updates.lapses !== undefined) dbUpdates.lapses = updates.lapses;

        await supabase.from("cards").update(dbUpdates).eq("id", cardId);
      }
    } catch (err) {
      console.warn("[repo] Supabase updateCard error:", err);
    }

    // 2. Update local disk/memory
    const lecture = lectureStore.get(lectureId) || loadLectureFromDisk(lectureId);
    if (!lecture) return null;
    const cardIndex = lecture.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return null;

    lecture.cards[cardIndex] = {
      ...lecture.cards[cardIndex],
      ...updates,
    };
    lectureStore.set(lectureId, lecture);
    saveLectureToDisk(lecture);
    return lecture.cards[cardIndex];
  },

  addCard: async (
    lectureId: string,
    card: Omit<DemoLectureData["cards"][0], "id">
  ): Promise<DemoLectureData["cards"][0] | null> => {
    const newId = crypto.randomUUID();
    const lecture = lectureStore.get(lectureId) || loadLectureFromDisk(lectureId);
    if (!lecture) return null;

    const newCard = {
      ...card,
      id: newId,
    };

    // 1. Insert into Supabase
    try {
      await supabase.from("cards").insert({
        id: newId,
        lecture_id: lectureId,
        user_id: toValidUuid(lecture.userId),
        type: card.type,
        front: card.front,
        back: card.back,
        bloom_level: card.bloomLevel || "remember",
        difficulty: card.difficulty || 3,
        evidence_quote: card.evidenceQuote || "",
        evidence_span: card.evidenceSpan || {},
        quality_scores: card.qualityScores || null,
        tags: card.tags || [],
        status: "active",
        fsrs_state: card.fsrsState || "New",
        due_date: card.dueDate || new Date().toISOString(),
        stability: card.stability || 0,
        fsrs_difficulty: card.fsrsDifficulty || 0,
        elapsed_days: card.elapsedDays || 0,
        scheduled_days: card.scheduledDays || 0,
        reps: card.reps || 0,
        lapses: card.lapses || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[repo] Supabase addCard error:", err);
    }

    // 2. Local store
    lecture.cards.push(newCard);
    lectureStore.set(lectureId, lecture);
    saveLectureToDisk(lecture);
    return newCard;
  },

  deleteCard: async (lectureId: string, cardId: string): Promise<boolean> => {
    // 1. Delete from Supabase
    try {
      if (isUuid(cardId)) {
        await supabase.from("cards").delete().eq("id", cardId);
      }
    } catch (err) {
      console.warn("[repo] Supabase deleteCard error:", err);
    }

    // 2. Local store
    const lecture = lectureStore.get(lectureId) || loadLectureFromDisk(lectureId);
    if (!lecture) return false;
    lecture.cards = lecture.cards.filter((c) => c.id !== cardId);
    lectureStore.set(lectureId, lecture);
    saveLectureToDisk(lecture);
    return true;
  },

  updateConceptsAndEdges: async (
    lectureId: string,
    concepts: DemoLectureData["concepts"],
    conceptEdges: DemoLectureData["conceptEdges"]
  ): Promise<boolean> => {
    const lecture = lectureStore.get(lectureId) || loadLectureFromDisk(lectureId);
    if (!lecture) return false;
    lecture.concepts = concepts;
    lecture.conceptEdges = conceptEdges;
    lectureStore.set(lectureId, lecture);
    saveLectureToDisk(lecture);
    return true;
  },

  // ==========================================
  // REVIEW LOGS
  // ==========================================
  logReview: async (log: Omit<ReviewLog, "id" | "reviewedAt">, userId?: string): Promise<ReviewLog> => {
    const safeUserId = toValidUuid(userId || log.userId);
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    const entry: ReviewLog = {
      ...log,
      userId: safeUserId,
      id: newId,
      reviewedAt: now,
    };

    // 1. Save to Supabase
    try {
      if (isUuid(log.cardId)) {
        await supabase.from("reviews").insert({
          id: newId,
          card_id: log.cardId,
          user_id: safeUserId,
          rating: log.rating,
          review_duration_ms: log.reviewDurationMs || 0,
          reviewed_at: now,
        });
      }
    } catch (err) {
      console.warn("[repo] Supabase logReview error:", err);
    }

    // 2. Local store
    reviewLogs.push(entry);
    saveReviewsToDisk();
    return entry;
  },

  getReviewLogs: async (userId?: string): Promise<ReviewLog[]> => {
    const safeUserId = toValidUuid(userId);

    // 1. Query Supabase
    try {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", safeUserId)
        .order("reviewed_at", { ascending: false });

      if (data && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          userId: r.user_id,
          cardId: r.card_id,
          rating: r.rating,
          reviewDurationMs: r.review_duration_ms,
          reviewedAt: r.reviewed_at,
        }));
      }
    } catch (err) {
      console.warn("[repo] Supabase getReviewLogs error:", err);
    }

    // 2. Local fallback
    loadReviewsFromDisk();
    if (!userId) return [...reviewLogs];
    return reviewLogs.filter((r) => r.userId === userId || r.userId === safeUserId);
  },

  // ==========================================
  // QUIZ ATTEMPTS & ANALYTICS
  // ==========================================
  logQuizAttempt: async (
    attempt: Omit<QuizAttemptLog, "id" | "attemptedAt">,
    userId?: string
  ): Promise<QuizAttemptLog> => {
    const safeUserId = toValidUuid(userId || attempt.userId);
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    const entry: QuizAttemptLog = {
      ...attempt,
      id: newId,
      userId: safeUserId,
      attemptedAt: now,
    };

    // 1. Save to Supabase quiz_attempts table
    try {
      if (isUuid(attempt.lectureId)) {
        await supabase.from("quiz_attempts").insert({
          id: newId,
          user_id: safeUserId,
          lecture_id: attempt.lectureId,
          lecture_title: attempt.lectureTitle || "Lecture Quiz",
          total_questions: attempt.totalQuestions,
          correct_answers: attempt.correctAnswers,
          score_percent: attempt.scorePercent,
          time_spent_seconds: attempt.timeSpentSeconds,
          violations_count: attempt.violationsCount || 0,
          terminated: Boolean(attempt.terminated),
          termination_reason: attempt.terminationReason || null,
          selected_topics: attempt.selectedTopics || [],
          difficulty: attempt.difficulty || "medium",
          question_results: attempt.questionResults || [],
          attempted_at: now,
        });
      }
    } catch (err) {
      console.warn("[repo] Supabase logQuizAttempt error:", err);
    }

    // 2. Local store
    loadQuizAttemptsFromDisk();
    quizAttempts.unshift(entry);
    saveQuizAttemptsToDisk();
    return entry;
  },

  getQuizAttempts: async (userId?: string, lectureId?: string): Promise<QuizAttemptLog[]> => {
    const safeUserId = toValidUuid(userId);

    // 1. Query Supabase
    try {
      let query = supabase.from("quiz_attempts").select("*").eq("user_id", safeUserId).order("attempted_at", { ascending: false });
      if (lectureId && isUuid(lectureId)) {
        query = query.eq("lecture_id", lectureId);
      }
      const { data } = await query;
      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          userId: d.user_id,
          lectureId: d.lecture_id,
          lectureTitle: d.lecture_title,
          totalQuestions: d.total_questions,
          correctAnswers: d.correct_answers,
          scorePercent: d.score_percent,
          timeSpentSeconds: d.time_spent_seconds,
          violationsCount: d.violations_count,
          terminated: d.terminated,
          terminationReason: d.termination_reason || undefined,
          selectedTopics: d.selected_topics || [],
          difficulty: d.difficulty,
          questionResults: d.question_results || [],
          attemptedAt: d.attempted_at,
        }));
      }
    } catch (err) {
      console.warn("[repo] Supabase getQuizAttempts error:", err);
    }

    // 2. Local fallback
    loadQuizAttemptsFromDisk();
    let list = [...quizAttempts];
    if (userId) {
      list = list.filter((a) => a.userId === userId || a.userId === safeUserId);
    }
    if (lectureId) {
      list = list.filter((a) => a.lectureId === lectureId);
    }
    return list;
  },
};
