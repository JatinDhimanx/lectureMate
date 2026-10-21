import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { scheduleReview } from "@/lib/fsrs/scheduler";
import type { FSRSRating } from "@/lib/fsrs/scheduler";

import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { lectureId, cardId, rating, reviewDurationMs = 0 } = body;

  if (!lectureId || !cardId || !rating) {
    return NextResponse.json({ error: "lectureId, cardId, and rating are required" }, { status: 400 });
  }

  const lecture = await repo.getLectureById(lectureId, user.id);
  if (!lecture) {
    return NextResponse.json({ error: "Lecture not found or access denied" }, { status: 404 });
  }

  const card = lecture.cards.find((c) => c.id === cardId);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const currentState = {
    state: card.fsrsState as "New" | "Learning" | "Review" | "Relearning",
    dueDate: card.dueDate,
    stability: card.stability,
    difficulty: card.fsrsDifficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: null,
  };

  const { updatedCard, nextIntervalDays } = scheduleReview(currentState, rating as FSRSRating);

  const updated = await repo.updateCard(lectureId, cardId, {
    fsrsState: updatedCard.state,
    dueDate: updatedCard.dueDate,
    stability: updatedCard.stability,
    fsrsDifficulty: updatedCard.difficulty,
    elapsedDays: updatedCard.elapsedDays,
    scheduledDays: updatedCard.scheduledDays,
    reps: updatedCard.reps,
    lapses: updatedCard.lapses,
  });

  await repo.logReview({ cardId, rating: rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4, reviewDurationMs });

  return NextResponse.json({ updatedCard: updated, nextIntervalDays });
}
