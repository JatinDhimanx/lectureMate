import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { repo } from "@/lib/db/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    const {
      lectureId,
      lectureTitle,
      selectedTopics = ["all"],
      difficulty = "medium",
      totalQuestions = 0,
      correctAnswers = 0,
      scorePercent = 0,
      timeSpentSeconds = 0,
      violationsCount = 0,
      terminated = false,
      terminationReason,
      questionResults = [],
    } = body;

    if (!lectureId) {
      return NextResponse.json({ error: "lectureId is required" }, { status: 400 });
    }

    const saved = await repo.logQuizAttempt(
      {
        lectureId,
        lectureTitle: lectureTitle || "Lecture Quiz",
        selectedTopics: Array.isArray(selectedTopics) ? selectedTopics : [selectedTopics],
        difficulty,
        totalQuestions: Number(totalQuestions),
        correctAnswers: Number(correctAnswers),
        scorePercent: Math.round(Number(scorePercent)),
        timeSpentSeconds: Number(timeSpentSeconds),
        violationsCount: Number(violationsCount),
        terminated: Boolean(terminated),
        terminationReason,
        questionResults,
      },
      user?.id
    );

    return NextResponse.json({
      success: true,
      attempt: saved,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record quiz submission";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
