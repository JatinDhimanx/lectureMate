import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type RecordLog,
  type Grade,
} from "ts-fsrs";

// Default FSRS parameters (tuned for academic content)
const params = generatorParameters({
  enable_fuzz: true,
  maximum_interval: 365,
  request_retention: 0.9,
});

const f = fsrs(params);

export type FSRSRating = "again" | "hard" | "good" | "easy";

export interface CardState {
  state: "New" | "Learning" | "Review" | "Relearning";
  dueDate: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview: string | null;
}

export interface SchedulingResult {
  updatedCard: CardState;
  nextIntervalDays: number;
  nextDueDate: string;
}

export const RATING_MAP: Record<FSRSRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/**
 * Convert our stored card state to ts-fsrs Card type
 */
function toFsrsCard(state: CardState): Card {
  const card = createEmptyCard(new Date(state.dueDate));
  return {
    ...card,
    due: new Date(state.dueDate),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    state: stateStringToFsrs(state.state),
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
  };
}

function stateStringToFsrs(s: string): Card["state"] {
  // ts-fsrs State enum: New=0, Learning=1, Review=2, Relearning=3
  switch (s) {
    case "New": return 0 as Card["state"];
    case "Learning": return 1 as Card["state"];
    case "Review": return 2 as Card["state"];
    case "Relearning": return 3 as Card["state"];
    default: return 0 as Card["state"];
  }
}

function fsrsStateToString(s: number): CardState["state"] {
  switch (s) {
    case 0: return "New";
    case 1: return "Learning";
    case 2: return "Review";
    case 3: return "Relearning";
    default: return "New";
  }
}

/**
 * Schedule a review and return the updated FSRS card state.
 */
export function scheduleReview(
  currentState: CardState,
  rating: FSRSRating,
  reviewedAt: Date = new Date()
): SchedulingResult {
  const fsrsCard = toFsrsCard(currentState);
  const grade = RATING_MAP[rating];

  const schedulingCards: RecordLog = f.repeat(fsrsCard, reviewedAt);
  const nextCard = schedulingCards[grade].card;

  const nextDue = nextCard.due;
  const daysDiff = Math.round(
    (nextDue.getTime() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const updatedState: CardState = {
    state: fsrsStateToString(nextCard.state),
    dueDate: nextDue.toISOString(),
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    elapsedDays: nextCard.elapsed_days,
    scheduledDays: nextCard.scheduled_days,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    lastReview: reviewedAt.toISOString(),
  };

  return {
    updatedCard: updatedState,
    nextIntervalDays: daysDiff,
    nextDueDate: nextDue.toISOString(),
  };
}

/**
 * Preview next intervals for all 4 ratings without committing.
 * Used to show "Again · 10m | Hard · 1d | Good · 4d | Easy · 12d" badges.
 */
export function previewNextIntervals(
  currentState: CardState,
  now: Date = new Date()
): Record<FSRSRating, { intervalDays: number; dueDate: string; label: string }> {
  const fsrsCard = toFsrsCard(currentState);
  const schedulingCards = f.repeat(fsrsCard, now);

  function formatInterval(ms: number): string {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(ms / 3600000);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(ms / 86400000);
    if (days < 30) return `${days}d`;
    const weeks = Math.round(days / 7);
    return `${weeks}w`;
  }

  const results = {} as Record<FSRSRating, { intervalDays: number; dueDate: string; label: string }>;

  for (const [ratingName, grade] of Object.entries(RATING_MAP) as [FSRSRating, Grade][]) {
    const nextCard = schedulingCards[grade].card;
    const nextDue = nextCard.due;
    const intervalMs = nextDue.getTime() - now.getTime();
    results[ratingName] = {
      intervalDays: Math.round(intervalMs / 86400000),
      dueDate: nextDue.toISOString(),
      label: formatInterval(intervalMs),
    };
  }

  return results;
}

/**
 * Create initial FSRS state for a brand-new card.
 */
export function createInitialCardState(): CardState {
  return {
    state: "New",
    dueDate: new Date().toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
  };
}

/**
 * Returns true if a card is due (due date <= now)
 */
export function isCardDue(cardState: CardState): boolean {
  return new Date(cardState.dueDate) <= new Date();
}

/**
 * Sort cards so that due cards come first, then Learning, then New.
 */
export function sortDueQueue<T extends { fsrsState: string; dueDate: string }>(
  cards: T[]
): T[] {
  return [...cards].sort((a, b) => {
    const stateOrder = (s: string) => {
      if (s === "Learning" || s === "Relearning") return 0;
      if (s === "Review" && new Date(a.dueDate) <= new Date()) return 0;
      if (s === "New") return 1;
      return 2;
    };
    const diff = stateOrder(a.fsrsState) - stateOrder(b.fsrsState);
    if (diff !== 0) return diff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}
