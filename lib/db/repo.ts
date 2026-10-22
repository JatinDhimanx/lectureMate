import fs from "fs";
import path from "path";
import os from "os";
import { SAMPLE_LECTURE_DATA, DemoLectureData } from "./mock-data";

import { hashPassword, verifyPassword } from "@/lib/auth/security";

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
  emailVerified?: boolean;
  verificationToken?: string;
  verificationExpiresAt?: string;
  resetToken?: string;
  resetTokenExpiresAt?: string;
  passwordResetAt?: string; // New column tracking password reset
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
  sample.userId = "demo-user-id";
  lectureStore.set(sample.id, sample);
  saveLectureToDisk(sample);
}

// Seed default demo user if empty
if (!userStore.has("demo@lecturemate.ai")) {
  userStore.set("demo@lecturemate.ai", {
    id: "demo-user-id",
    email: "demo@lecturemate.ai",
    passwordHash: "password123",
    fullName: "Demo Student",
    createdAt: new Date().toISOString(),
  });
  saveUsersToDisk();
}

export const repo = {
  // ==========================================
  // USER ACCOUNTS
  // ==========================================
  registerUser: async (user: {
    email: string;
    password: string;
    fullName?: string;
    emailVerified?: boolean;
    verificationToken?: string;
  }): Promise<UserAccount> => {
    const emailKey = user.email.toLowerCase().trim();
    const hexId = Buffer.from(emailKey).toString("hex").slice(0, 16);
    const now = new Date().toISOString();
    const account: UserAccount = {
      id: `usr_${hexId}`,
      email: emailKey,
      passwordHash: hashPassword(user.password),
      fullName: user.fullName || emailKey.split("@")[0],
      emailVerified: user.emailVerified ?? false,
      verificationToken: user.verificationToken,
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    userStore.set(emailKey, account);
    saveUsersToDisk();
    return account;
  },

  createVerificationToken: async (email: string): Promise<string> => {
    loadUsersFromDisk();
    const emailKey = email.toLowerCase().trim();
    const account = userStore.get(emailKey);
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (account) {
      account.verificationToken = token;
      account.verificationExpiresAt = expiresAt;
      account.updatedAt = new Date().toISOString();
      userStore.set(emailKey, account);
      saveUsersToDisk();
    }
    return token;
  },

  verifyEmailByToken: async (email: string, token: string): Promise<boolean> => {
    loadUsersFromDisk();
    const emailKey = email.toLowerCase().trim();
    const account = userStore.get(emailKey);
    if (!account) return false;
    if (account.verificationToken && account.verificationToken === token.trim()) {
      account.emailVerified = true;
      account.verificationToken = undefined;
      account.verificationExpiresAt = undefined;
      account.updatedAt = new Date().toISOString();
      userStore.set(emailKey, account);
      saveUsersToDisk();
      return true;
    }
    return false;
  },

  createResetToken: async (email: string): Promise<string | null> => {
    loadUsersFromDisk();
    const emailKey = email.toLowerCase().trim();
    const account = userStore.get(emailKey);
    if (!account) return null;
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    account.resetToken = token;
    account.resetTokenExpiresAt = expiresAt;
    account.updatedAt = new Date().toISOString();
    userStore.set(emailKey, account);
    saveUsersToDisk();
    return token;
  },

  verifyResetToken: async (email: string, token: string): Promise<boolean> => {
    loadUsersFromDisk();
    const emailKey = email.toLowerCase().trim();
    const account = userStore.get(emailKey);
    if (!account || !account.resetToken) return false;
    if (account.resetTokenExpiresAt && new Date(account.resetTokenExpiresAt).getTime() < Date.now()) {
      return false;
    }
    return account.resetToken === token.trim();
  },

  findUserByEmail: async (email: string): Promise<UserAccount | null> => {
    loadUsersFromDisk();
    const account = userStore.get(email.toLowerCase().trim());
    return account ? JSON.parse(JSON.stringify(account)) : null;
  },

  findUserById: async (id: string): Promise<UserAccount | null> => {
    loadUsersFromDisk();
    for (const acc of userStore.values()) {
      if (acc.id === id) {
        return JSON.parse(JSON.stringify(acc));
      }
    }
    return null;
  },

  verifyUserPassword: async (email: string, password: string): Promise<UserAccount | null> => {
    loadUsersFromDisk();
    const emailKey = email.toLowerCase().trim();
    const account = userStore.get(emailKey);
    if (!account) return null;

    if (verifyPassword(password, account.passwordHash)) {
      account.lastLoginAt = new Date().toISOString();
      userStore.set(emailKey, account);
      saveUsersToDisk();
      return JSON.parse(JSON.stringify(account));
    }
    return null;
  },

  updateUserPassword: async (email: string, newPassword: string): Promise<boolean> => {
    const emailKey = email.toLowerCase().trim();
    loadUsersFromDisk();
    const account = userStore.get(emailKey);
    const now = new Date().toISOString();
    const hashed = hashPassword(newPassword);

    if (!account) {
      const hexId = Buffer.from(emailKey).toString("hex").slice(0, 16);
      userStore.set(emailKey, {
        id: `usr_${hexId}`,
        email: emailKey,
        passwordHash: hashed,
        fullName: emailKey.split("@")[0],
        emailVerified: true,
        passwordResetAt: now,
        createdAt: now,
        updatedAt: now,
      });
      saveUsersToDisk();
      return true;
    }

    account.passwordHash = hashed;
    account.passwordResetAt = now;
    account.resetToken = undefined;
    account.resetTokenExpiresAt = undefined;
    account.updatedAt = now;
    userStore.set(emailKey, account);
    saveUsersToDisk();
    return true;
  },

  // ==========================================
  // LECTURES (USER ISOLATED & DISK PERSISTED)
  // ==========================================
  getLectures: async (userId?: string): Promise<DemoLectureData[]> => {
    // Read from disk to pick up any lectures created across worker processes
    const all = loadAllLecturesFromDisk();
    let result: DemoLectureData[];

    if (!userId) {
      result = all;
    } else if (userId === "demo-user-id" || userId.includes("demo")) {
      result = all.filter((l) => l.userId === "demo-user-id" || l.userId === userId || !l.userId);
    } else {
      // Include user's own lectures and any unassigned/legacy lectures
      result = all.filter((l) => l.userId === userId || !l.userId);
    }

    // Sort by createdAt / recency descending so the latest uploaded document is always first
    return result.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  },

  getLectureById: async (id: string, userId?: string): Promise<DemoLectureData | null> => {
    if (!id || id === "undefined") return null;

    let lecture = lectureStore.get(id);
    if (!lecture) {
      // Check disk in case it was written by another worker process or prior session
      lecture = loadLectureFromDisk(id) || undefined;
    }
    if (!lecture) return null;

    // Check ownership if userId provided
    if (userId && lecture.userId && lecture.userId !== userId) {
      // Demo lecture or unassigned legacy lecture can be accessed
      if (!lecture.userId || lecture.userId === "demo-user-id" || userId === "demo-user-id" || userId.includes("demo")) {
        return JSON.parse(JSON.stringify(lecture));
      }
      return null;
    }

    return JSON.parse(JSON.stringify(lecture));
  },

  saveLecture: async (data: DemoLectureData, userId?: string): Promise<DemoLectureData> => {
    const toSave: DemoLectureData = {
      ...JSON.parse(JSON.stringify(data)),
      userId: userId || data.userId || "demo-user-id",
      createdAt: data.createdAt || new Date().toISOString(),
    };
    lectureStore.set(toSave.id, toSave);
    saveLectureToDisk(toSave);
    return toSave;
  },

  deleteLecture: async (id: string, userId?: string): Promise<boolean> => {
    const lecture = lectureStore.get(id) || loadLectureFromDisk(id);
    if (!lecture) return false;
    if (userId && lecture.userId && lecture.userId !== userId && userId !== "demo-user-id") {
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
    const now = new Date();
    const userLectures = await repo.getLectures(userId);
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
    const lecture = lectureStore.get(lectureId) || loadLectureFromDisk(lectureId);
    if (!lecture) return null;
    const newCard = {
      ...card,
      id: "card-" + Math.random().toString(36).substring(2, 9),
    };
    lecture.cards.push(newCard);
    lectureStore.set(lectureId, lecture);
    saveLectureToDisk(lecture);
    return newCard;
  },

  deleteCard: async (lectureId: string, cardId: string): Promise<boolean> => {
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
    const entry: ReviewLog = {
      ...log,
      userId: userId || log.userId || "demo-user-id",
      id: "rev-" + Math.random().toString(36).substring(2, 9),
      reviewedAt: new Date().toISOString(),
    };
    reviewLogs.push(entry);
    saveReviewsToDisk();
    return entry;
  },

  getReviewLogs: async (userId?: string): Promise<ReviewLog[]> => {
    loadReviewsFromDisk();
    if (!userId) return [...reviewLogs];
    return reviewLogs.filter((r) => r.userId === userId || (!r.userId && userId === "demo-user-id"));
  },

  // ==========================================
  // QUIZ ATTEMPTS & ANALYTICS
  // ==========================================
  logQuizAttempt: async (
    attempt: Omit<QuizAttemptLog, "id" | "attemptedAt">,
    userId?: string
  ): Promise<QuizAttemptLog> => {
    loadQuizAttemptsFromDisk();
    const entry: QuizAttemptLog = {
      ...attempt,
      id: "qa-" + Math.random().toString(36).substring(2, 9),
      userId: userId || attempt.userId || "demo-user-id",
      attemptedAt: new Date().toISOString(),
    };
    quizAttempts.unshift(entry);
    saveQuizAttemptsToDisk();
    return entry;
  },

  getQuizAttempts: async (userId?: string, lectureId?: string): Promise<QuizAttemptLog[]> => {
    loadQuizAttemptsFromDisk();
    let list = [...quizAttempts];
    if (userId) {
      list = list.filter((a) => a.userId === userId || (!a.userId && userId === "demo-user-id"));
    }
    if (lectureId) {
      list = list.filter((a) => a.lectureId === lectureId);
    }
    return list;
  },
};
