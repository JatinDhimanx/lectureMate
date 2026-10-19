import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

export async function GET() {
  const lectures = await repo.getLectures();
  return NextResponse.json(lectures.map((l) => ({
    id: l.id,
    title: l.title,
    sourceType: l.sourceType,
    wordCount: l.wordCount,
    cardCount: l.cards.length,
    quizCount: l.quizQuestions.length,
    qualityReport: l.qualityReport,
    createdAt: new Date().toISOString(),
  })));
}
