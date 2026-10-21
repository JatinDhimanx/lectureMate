import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const lectures = await repo.getLectures(user.id);
  return NextResponse.json(
    lectures.map((l) => ({
      id: l.id,
      title: l.title,
      sourceType: l.sourceType,
      wordCount: l.wordCount,
      cardCount: l.cards.length,
      quizCount: l.quizQuestions.length,
      qualityReport: l.qualityReport,
      createdAt: new Date().toISOString(),
    })),
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
