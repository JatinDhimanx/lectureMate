import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const { id } = await params;
  const cleanId = id ? decodeURIComponent(id).trim() : "";
  if (!cleanId || cleanId === "undefined") {
    return NextResponse.json({ error: "Invalid lecture ID" }, { status: 400 });
  }

  // Strict data isolation: only the owner can retrieve their lecture
  const lecture = await repo.getLectureById(cleanId, user.id);
  if (!lecture) {
    return NextResponse.json({ error: "Lecture not found or access denied." }, { status: 404 });
  }

  return NextResponse.json(lecture, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const { id } = await params;
  const cleanId = id ? decodeURIComponent(id).trim() : "";

  // Verify ownership before modification
  const existing = await repo.getLectureById(cleanId, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Lecture not found or access denied." }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (body.concepts && body.conceptEdges) {
      await repo.updateConceptsAndEdges(cleanId, body.concepts, body.conceptEdges);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Missing concepts or conceptEdges" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update lecture map" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  const { id } = await params;
  const cleanId = id ? decodeURIComponent(id).trim() : "";

  const existing = await repo.getLectureById(cleanId, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Lecture not found or access denied." }, { status: 403 });
  }

  const deleted = await repo.deleteLecture(cleanId, user.id);
  return NextResponse.json({ success: deleted });
}
