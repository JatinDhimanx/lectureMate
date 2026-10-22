import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { checkLockout, recordFailedAttempt, resetFailedAttempts } from "@/lib/auth/lockout";
import { createSessionToken } from "@/lib/auth/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Handle one-click verification link from email
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    if (!token || !email) {
      return NextResponse.redirect(
        new URL("/auth/login?verified=error", request.nextUrl.origin)
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Check lockout
    const lockout = await checkLockout(trimmedEmail);
    if (lockout.isLocked) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?verified=locked&remaining=${lockout.remainingMinutes}&email=${encodeURIComponent(trimmedEmail)}`,
          request.nextUrl.origin
        )
      );
    }

    const verified = await repo.verifyEmailByToken(trimmedEmail, token);

    if (verified) {
      await resetFailedAttempts(trimmedEmail);
      return NextResponse.redirect(
        new URL(
          `/auth/verified?email=${encodeURIComponent(trimmedEmail)}`,
          request.nextUrl.origin
        )
      );
    } else {
      await recordFailedAttempt(trimmedEmail);
      return NextResponse.redirect(
        new URL(
          `/auth/login?verified=error&email=${encodeURIComponent(trimmedEmail)}`,
          request.nextUrl.origin
        )
      );
    }
  } catch (err) {
    console.error("[VerifyEmail] Error verifying token:", err);
    return NextResponse.redirect(
      new URL("/auth/login?verified=error", request.nextUrl.origin)
    );
  }
}

// Handle manual 6-digit code verification POST request
export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    // 1. Check 15-minute security lockout
    const lockout = await checkLockout(trimmedEmail);
    if (lockout.isLocked) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Your account is temporarily locked for ${lockout.remainingMinutes} more minute(s). Please wait before trying again.`,
          code: "ACCOUNT_LOCKED",
          remainingMinutes: lockout.remainingMinutes,
        },
        { status: 429 }
      );
    }

    // 2. Verify 6-digit OTP against Supabase database
    const verified = await repo.verifyEmailByToken(trimmedEmail, cleanToken);

    if (!verified) {
      const failed = await recordFailedAttempt(trimmedEmail);

      if (failed.isLocked) {
        return NextResponse.json(
          {
            error: "Too many incorrect verification attempts (5/5). Your account has been locked for 15 minutes.",
            code: "ACCOUNT_LOCKED",
            remainingMinutes: 15,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid or expired verification code. (${failed.attemptsLeft} attempt(s) remaining before a 15-minute lockout)`,
          attemptsLeft: failed.attemptsLeft,
        },
        { status: 400 }
      );
    }

    // 3. Reset failed attempts counter on success
    await resetFailedAttempts(trimmedEmail);

    // 4. Fetch verified user to generate session
    const user = await repo.findUserByEmail(trimmedEmail);
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Email verified successfully! You may now sign in.",
        redirectTo: "/auth/login",
      });
    }

    // 5. Generate secure session so verified user enters dashboard directly
    const sessionToken = createSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    const response = NextResponse.json({
      success: true,
      message: "Email verified successfully! Loading your study dashboard...",
      redirectTo: "/dashboard",
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
      },
    });

    response.cookies.set("lm_session", sessionToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("demo_auth_user", user.email, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
