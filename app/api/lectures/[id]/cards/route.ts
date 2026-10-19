import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { createInitialCardState } from "@/lib/fsrs/scheduler";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lectureId } = await params;
  const body = await req.json();

  const initialFsrs = createInitialCardState();

  const newCard = await repo.addCard(lectureId, {
    conceptId: body.conceptId || "general",
    type: body.type || body.archetype || "basic",
    front: body.front,
    back: body.back,
    evidenceQuote: body.evidenceQuote || "",
    evidenceSpan: body.evidenceSpan || { startChar: 0, endChar: 0 },
    bloomLevel: body.bloomLevel || "remember",
    difficulty: body.difficulty || 2,
    qualityScores: { groundedness: 1.0, clarity: 1.0, uniqueness: 1.0 },
    tags: body.tags || [],
    fsrsState: initialFsrs.state,
    stability: initialFsrs.stability,
    fsrsDifficulty: initialFsrs.difficulty,
    elapsedDays: initialFsrs.elapsedDays,
    scheduledDays: initialFsrs.scheduledDays,
    reps: initialFsrs.reps,
    lapses: initialFsrs.lapses,
    dueDate: initialFsrs.dueDate,
  });

  if (!newCard) {
    return NextResponse.json({ error: "Lecture not found" }, { status: 404 });
  }

  return NextResponse.json(newCard, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lectureId } = await params;
  const body = await req.json();
  const { cardId, ...updates } = body;

  if (!cardId) {
    return NextResponse.json({ error: "Missing cardId" }, { status: 400 });
  }

  const updated = await repo.updateCard(lectureId, cardId, updates);
  if (!updated) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lectureId } = await params;
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json({ error: "Missing cardId parameter" }, { status: 400 });
  }

  const success = await repo.deleteCard(lectureId, cardId);
  return NextResponse.json({ success });
}
