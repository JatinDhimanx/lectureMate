import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { repo } from "@/lib/db/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const lectureId = searchParams.get("lectureId") || undefined;

    const attempts = await repo.getQuizAttempts(user.id, lectureId);

    const totalAttempts = attempts.length;
    const averageScore = totalAttempts > 0
      ? Math.round(attempts.reduce((acc, a) => acc + a.scorePercent, 0) / totalAttempts)
      : 0;
    const highestScore = totalAttempts > 0
      ? Math.max(...attempts.map((a) => a.scorePercent))
      : 0;
    const totalQuestionsSolved = attempts.reduce((acc, a) => acc + a.totalQuestions, 0);

    return NextResponse.json({
      attempts,
      stats: {
        totalAttempts,
        averageScore,
        highestScore,
        totalQuestionsSolved,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load quiz analytics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
