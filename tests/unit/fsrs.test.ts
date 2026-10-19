import { describe, it, expect } from "vitest";
import {
  scheduleReview,
  previewNextIntervals,
  createInitialCardState,
  isCardDue,
  sortDueQueue,
  type CardState,
} from "@/lib/fsrs/scheduler";

describe("FSRS Spaced Repetition Engine", () => {
  it("creates a valid initial card state", () => {
    const card = createInitialCardState();
    expect(card.state).toBe("New");
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.lastReview).toBeNull();
    expect(new Date(card.dueDate).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("transitions state correctly when reviewing a New card with Good", () => {
    const card = createInitialCardState();
    const now = new Date("2026-10-01T10:00:00Z");
    const result = scheduleReview(card, "good", now);

    expect(result.updatedCard.reps).toBe(1);
    expect(result.updatedCard.lapses).toBe(0);
    expect(result.updatedCard.lastReview).toBe(now.toISOString());
    expect(result.updatedCard.stability).toBeGreaterThan(0);
    expect(result.updatedCard.difficulty).toBeGreaterThan(0);
    expect(new Date(result.nextDueDate).getTime()).toBeGreaterThan(now.getTime());
  });

  it("handles 'again' rating by increasing lapses on review cards", () => {
    const reviewCard: CardState = {
      state: "Review",
      dueDate: "2026-10-01T10:00:00Z",
      stability: 10,
      difficulty: 5,
      elapsedDays: 10,
      scheduledDays: 10,
      reps: 5,
      lapses: 0,
      lastReview: "2026-09-21T10:00:00Z",
    };

    const now = new Date("2026-10-01T10:00:00Z");
    const result = scheduleReview(reviewCard, "again", now);

    expect(result.updatedCard.lapses).toBe(1);
    expect(result.updatedCard.reps).toBe(6);
    expect(result.updatedCard.state).toBe("Relearning");
  });

  it("generates interval preview labels for all 4 ratings", () => {
    const card = createInitialCardState();
    const now = new Date("2026-10-01T10:00:00Z");
    const previews = previewNextIntervals(card, now);

    expect(previews.again).toBeDefined();
    expect(previews.hard).toBeDefined();
    expect(previews.good).toBeDefined();
    expect(previews.easy).toBeDefined();

    expect(typeof previews.again.label).toBe("string");
    expect(typeof previews.good.label).toBe("string");
    expect(previews.again.label.length).toBeGreaterThan(0);
  });

  it("correctly identifies due and non-due cards", () => {
    const pastCard: CardState = {
      ...createInitialCardState(),
      dueDate: new Date(Date.now() - 3600000).toISOString(),
    };
    const futureCard: CardState = {
      ...createInitialCardState(),
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    };

    expect(isCardDue(pastCard)).toBe(true);
    expect(isCardDue(futureCard)).toBe(false);
  });

  it("sorts queue prioritizing learning and due cards", () => {
    const now = new Date();
    const cards = [
      { id: "1", fsrsState: "New", dueDate: new Date(now.getTime() + 1000).toISOString() },
      { id: "2", fsrsState: "Learning", dueDate: new Date(now.getTime() - 2000).toISOString() },
      { id: "3", fsrsState: "Review", dueDate: new Date(now.getTime() + 50000).toISOString() },
    ];

    const sorted = sortDueQueue(cards);
    expect(sorted[0].id).toBe("2"); // Learning comes first
  });
});
