import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      authenticated: Boolean(user),
      user: user || null,
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
