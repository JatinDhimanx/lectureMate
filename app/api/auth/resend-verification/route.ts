import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const origin = request.nextUrl.origin;
    const supabase = await createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      const isRateLimited =
        error.message.toLowerCase().includes("rate limit") ||
        error.message.toLowerCase().includes("over_email_send_rate_limit") ||
        error.status === 429;

      if (isRateLimited) {
        return NextResponse.json(
          {
            error: "Email rate limit exceeded (free tier limit: 3-4 emails/hour). Please wait a few minutes before resending.",
            code: "RATE_LIMITED",
          },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `A new verification email has been sent to ${trimmedEmail}! Please check your inbox.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to resend verification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
