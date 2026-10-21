import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const lectureData = await req.json();
    if (!lectureData || !lectureData.id) {
      return NextResponse.json({ error: "Invalid lecture data" }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    const saved = await repo.saveLecture(lectureData, currentUser?.id);
    return NextResponse.json({ success: true, lectureId: saved.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
