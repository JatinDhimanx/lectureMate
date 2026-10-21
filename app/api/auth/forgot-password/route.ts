import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const origin = request.nextUrl.origin;

    // Trigger Supabase password recovery email if configured
    try {
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${origin}/auth/callback?type=recovery&next=/auth/reset-password`,
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: `If an account with ${trimmedEmail} exists, password reset instructions have been sent to your email inbox.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
