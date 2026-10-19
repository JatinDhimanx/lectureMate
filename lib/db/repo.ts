import { SAMPLE_LECTURE_DATA, DemoLectureData } from "./mock-data";

// Global in-memory storage for local runtime & demo
let lectureStore: Map<string, DemoLectureData> = new Map();
lectureStore.set(SAMPLE_LECTURE_DATA.id, JSON.parse(JSON.stringify(SAMPLE_LECTURE_DATA)));

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: number; // 1-4
  reviewDurationMs: number;
  reviewedAt: string;
}

const reviewLogs: ReviewLog[] = [];

export const repo = {
  getLectures: async (): Promise<DemoLectureData[]> => {
    return Array.from(lectureStore.values());
  },

  getLectureById: async (id: string): Promise<DemoLectureData | null> => {
    const lecture = lectureStore.get(id);
    return lecture ? JSON.parse(JSON.stringify(lecture)) : null;
  },

  saveLecture: async (data: DemoLectureData): Promise<DemoLectureData> => {
    lectureStore.set(data.id, JSON.parse(JSON.stringify(data)));
    return data;
  },

  deleteLecture: async (id: string): Promise<boolean> => {
    return lectureStore.delete(id);
  },

  getCardsDueToday: async (): Promise<DemoLectureData["cards"]> => {
    const now = new Date();
    const allCards: DemoLectureData["cards"] = [];
    for (const l of lectureStore.values()) {
      for (const c of l.cards) {
        if (new Date(c.dueDate) <= now || c.fsrsState === "New") {
          allCards.push(c);
        }
      }
    }
    return allCards;
  },

  getAllCards: async (): Promise<DemoLectureData["cards"]> => {
    const allCards: DemoLectureData["cards"] = [];
    for (const l of lectureStore.values()) {
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

  logReview: async (log: Omit<ReviewLog, "id" | "reviewedAt">): Promise<ReviewLog> => {
    const entry: ReviewLog = {
      ...log,
      id: "rev-" + Math.random().toString(36).substring(2, 9),
      reviewedAt: new Date().toISOString(),
    };
    reviewLogs.push(entry);
    return entry;
  },

  getReviewLogs: async (): Promise<ReviewLog[]> => {
    return [...reviewLogs];
  },
};
