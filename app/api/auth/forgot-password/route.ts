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

    // Trigger Supabase password recovery email
    try {
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${origin}/auth/reset-password`,
      });
    } catch {
      // ignore
    }

    const resetUrl = `${origin}/auth/reset-password?email=${encodeURIComponent(trimmedEmail)}`;

    return NextResponse.json({
      success: true,
      resetUrl,
      message: `If an account with ${trimmedEmail} exists, password reset instructions have been prepared. You can check your inbox or reset directly below.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
