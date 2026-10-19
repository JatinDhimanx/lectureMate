import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

export async function GET() {
  const lectures = await repo.getLectures();
  const allCards = await repo.getAllCards();
  const dueCards = await repo.getCardsDueToday();

  let newCards = 0;
  let learningCards = 0;
  let reviewCards = 0;

  for (const c of allCards) {
    if (c.fsrsState === "New") newCards++;
    else if (c.fsrsState === "Learning") learningCards++;
    else if (c.fsrsState === "Review") reviewCards++;
  }

  const reviewLogs = await repo.getReviewLogs();
  const correctReviews = reviewLogs.filter((r) => r.rating >= 3).length;
  const retentionRate = reviewLogs.length > 0 ? Math.round((correctReviews / reviewLogs.length) * 100) : 92;

  return NextResponse.json({
    totalLectures: lectures.length,
    totalCards: allCards.length,
    dueToday: dueCards.length,
    newCards,
    learningCards,
    reviewCards,
    retentionRate,
    streak: Math.min(Math.max(1, reviewLogs.length), 14),
    lectures: lectures.map((l) => ({
      id: l.id,
      title: l.title,
      sourceType: l.sourceType,
      wordCount: l.wordCount,
      cardCount: l.cards.length,
      quizCount: l.quizQuestions.length,
      qualityReport: l.qualityReport,
      createdAt: new Date().toISOString(),
    })),
  });
}
