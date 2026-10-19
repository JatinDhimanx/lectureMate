import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lecture = await repo.getLectureById(id);
  if (!lecture) {
    return NextResponse.json({ error: "Lecture not found" }, { status: 404 });
  }
  return NextResponse.json(lecture);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await repo.deleteLecture(id);
  return NextResponse.json({ success: deleted });
}
