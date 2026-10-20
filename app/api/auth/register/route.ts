import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const origin = request.nextUrl.origin;

    // 1. Check if user is already registered in local repo store
    const existingUser = await repo.findUserByEmail(trimmedEmail);
    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists. Please log in instead.",
          code: "USER_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    // 2. Attempt Supabase signUp with email confirmation callback
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: fullName || trimmedEmail.split("@")[0],
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      const isAlreadyRegistered =
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already exists") ||
        error.status === 422;

      if (isAlreadyRegistered) {
        return NextResponse.json(
          {
            error: "An account with this email already exists. Please log in instead.",
            code: "USER_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }

      // Check if Supabase rate-limited email sending (free project limit: 3-4 emails/hour)
      const isRateLimited =
        error.message.toLowerCase().includes("rate limit") ||
        error.message.toLowerCase().includes("over_email_send_rate_limit") ||
        error.status === 429;

      if (isRateLimited) {
        return NextResponse.json(
          {
            error: "Supabase email rate limit exceeded (free tier has an hourly limit of 3-4 emails). Please wait a few minutes or check if you already received an email.",
            code: "RATE_LIMITED",
          },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // In Supabase with email confirmation enabled, duplicate signups return an empty identities array
    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return NextResponse.json(
        {
          error: "An account with this email already exists. Please log in instead.",
          code: "USER_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    // NOTE: We DO NOT store the user in the database (repo) here!
    // The user must first verify their email via Supabase confirmation link.
    // The user will be stored in DB when they verify via /auth/callback or first verified login.
    const hasSession = Boolean(data.session);

    const response = NextResponse.json({
      success: true,
      hasSession: false,
      user: data.user,
      message: `A verification link has been sent to ${trimmedEmail}. Please check your email inbox and verify your email before logging in.`,
    });

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Signup registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
