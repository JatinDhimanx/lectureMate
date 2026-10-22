import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut().catch(() => {});
  } catch {
    // ignore
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
    redirectTo: "/auth/login",
  });

  // Explicitly expire core session cookies across the entire site path
  const cookieNamesToClear = ["lm_session", "demo_auth_user"];

  // Also collect any supabase cookies present in the request
  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-") || cookieNamesToClear.includes(cookie.name)) {
      if (!cookieNamesToClear.includes(cookie.name)) {
        cookieNamesToClear.push(cookie.name);
      }
    }
  }

  for (const name of cookieNamesToClear) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: name === "lm_session",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  return response;
}
