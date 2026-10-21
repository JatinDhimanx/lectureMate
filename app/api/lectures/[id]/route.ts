import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleanId = id ? decodeURIComponent(id).trim() : "";
  if (!cleanId || cleanId === "undefined") {
    return NextResponse.json({ error: "Invalid lecture ID" }, { status: 400 });
  }

  const lecture = await repo.getLectureById(cleanId);
  if (!lecture) {
    return NextResponse.json({ error: "Lecture not found" }, { status: 404 });
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
  const { id } = await params;
  const cleanId = id ? decodeURIComponent(id).trim() : "";
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
  const { id } = await params;
  const cleanId = id ? decodeURIComponent(id).trim() : "";
  const deleted = await repo.deleteLecture(cleanId);
  return NextResponse.json({ success: deleted });
}
