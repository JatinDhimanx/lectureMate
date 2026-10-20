import { SAMPLE_LECTURE_DATA, DemoLectureData } from "./mock-data";

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
  passwordHash: string; // Plain/hashed password for local verification
  fullName: string;
  createdAt: string;
}

// Global in-memory storage preserved across Next.js dev server hot-module-reloads
const globalForRepo = globalThis as unknown as {
  lectureStore: Map<string, DemoLectureData>;
  reviewLogs: ReviewLog[];
  userStore: Map<string, UserAccount>;
};

const lectureStore: Map<string, DemoLectureData> =
  globalForRepo.lectureStore || (globalForRepo.lectureStore = new Map());
const reviewLogs: ReviewLog[] =
  globalForRepo.reviewLogs || (globalForRepo.reviewLogs = []);
const userStore: Map<string, UserAccount> =
  globalForRepo.userStore || (globalForRepo.userStore = new Map());

// Seed sample lecture for demo session if empty
if (lectureStore.size === 0) {
  const sample = JSON.parse(JSON.stringify(SAMPLE_LECTURE_DATA)) as DemoLectureData;
  sample.userId = "demo-user-id";
  lectureStore.set(sample.id, sample);
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
}

export const repo = {
  // ==========================================
  // USER ACCOUNTS
  // ==========================================
  registerUser: async (user: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<UserAccount> => {
    const emailKey = user.email.toLowerCase().trim();
    const hexId = Buffer.from(emailKey).toString("hex").slice(0, 16);
    const account: UserAccount = {
      id: `usr_${hexId}`,
      email: emailKey,
      passwordHash: user.password,
      fullName: user.fullName || emailKey.split("@")[0],
      createdAt: new Date().toISOString(),
    };
    userStore.set(emailKey, account);
    return account;
  },

  findUserByEmail: async (email: string): Promise<UserAccount | null> => {
    const account = userStore.get(email.toLowerCase().trim());
    return account ? JSON.parse(JSON.stringify(account)) : null;
  },

  verifyUserPassword: async (email: string, password: string): Promise<UserAccount | null> => {
    const account = userStore.get(email.toLowerCase().trim());
    if (!account) return null;
    if (account.passwordHash === password) {
      return JSON.parse(JSON.stringify(account));
    }
    return null;
  },

  updateUserPassword: async (email: string, newPassword: string): Promise<boolean> => {
    const emailKey = email.toLowerCase().trim();
    const account = userStore.get(emailKey);
    if (!account) {
      // create entry if missing
      userStore.set(emailKey, {
        id: `usr_${Buffer.from(emailKey).toString("hex").slice(0, 16)}`,
        email: emailKey,
        passwordHash: newPassword,
        fullName: emailKey.split("@")[0],
        createdAt: new Date().toISOString(),
      });
      return true;
    }
    account.passwordHash = newPassword;
    userStore.set(emailKey, account);
    return true;
  },

  // ==========================================
  // LECTURES (USER ISOLATED)
  // ==========================================
  getLectures: async (userId?: string): Promise<DemoLectureData[]> => {
    const all = Array.from(lectureStore.values());
    if (!userId) return all;

    // If demo user, include the initial sample lecture
    if (userId === "demo-user-id" || userId.includes("demo")) {
      return all.filter((l) => l.userId === "demo-user-id" || l.userId === userId || !l.userId);
    }

    // Filter strictly by the user's own ID
    return all.filter((l) => l.userId === userId);
  },

  getLectureById: async (id: string, userId?: string): Promise<DemoLectureData | null> => {
    const lecture = lectureStore.get(id);
    if (!lecture) return null;

    // Check ownership if userId provided
    if (userId && lecture.userId && lecture.userId !== userId) {
      // Demo lecture can be viewed by demo user
      if (lecture.userId === "demo-user-id" && (userId === "demo-user-id" || userId.includes("demo"))) {
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
    };
    lectureStore.set(toSave.id, toSave);
    return toSave;
  },

  deleteLecture: async (id: string, userId?: string): Promise<boolean> => {
    const lecture = lectureStore.get(id);
    if (!lecture) return false;
    if (userId && lecture.userId && lecture.userId !== userId && userId !== "demo-user-id") {
      return false;
    }
    return lectureStore.delete(id);
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
    const lecture = lectureStore.get(lectureId);
    if (!lecture) return null;
    const cardIndex = lecture.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return null;

    lecture.cards[cardIndex] = {
      ...lecture.cards[cardIndex],
      ...updates,
    };
    lectureStore.set(lectureId, lecture);
    return lecture.cards[cardIndex];
  },

  addCard: async (
    lectureId: string,
    card: Omit<DemoLectureData["cards"][0], "id">
  ): Promise<DemoLectureData["cards"][0] | null> => {
    const lecture = lectureStore.get(lectureId);
    if (!lecture) return null;
    const newCard = {
      ...card,
      id: "card-" + Math.random().toString(36).substring(2, 9),
    };
    lecture.cards.push(newCard);
    lectureStore.set(lectureId, lecture);
    return newCard;
  },

  deleteCard: async (lectureId: string, cardId: string): Promise<boolean> => {
    const lecture = lectureStore.get(lectureId);
    if (!lecture) return false;
    lecture.cards = lecture.cards.filter((c) => c.id !== cardId);
    lectureStore.set(lectureId, lecture);
    return true;
  },

  updateConceptsAndEdges: async (
    lectureId: string,
    concepts: DemoLectureData["concepts"],
    conceptEdges: DemoLectureData["conceptEdges"]
  ): Promise<boolean> => {
    const lecture = lectureStore.get(lectureId);
    if (!lecture) return false;
    lecture.concepts = concepts;
    lecture.conceptEdges = conceptEdges;
    lectureStore.set(lectureId, lecture);
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
    return entry;
  },

  getReviewLogs: async (userId?: string): Promise<ReviewLog[]> => {
    if (!userId) return [...reviewLogs];
    return reviewLogs.filter((r) => r.userId === userId || (!r.userId && userId === "demo-user-id"));
  },
};
