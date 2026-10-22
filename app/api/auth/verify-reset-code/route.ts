import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { checkLockout, recordFailedAttempt, resetFailedAttempts } from "@/lib/auth/lockout";
import { createResetTicket } from "@/lib/auth/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check 15-minute lockout
    const lockout = await checkLockout(trimmedEmail);
    if (lockout.isLocked) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Your account is temporarily locked for ${lockout.remainingMinutes} more minute(s).`,
          code: "ACCOUNT_LOCKED",
          remainingMinutes: lockout.remainingMinutes,
        },
        { status: 429 }
      );
    }

    const cleanCode = typeof code === "string" ? code.trim() : "";
    if (!cleanCode || cleanCode.length < 6) {
      return NextResponse.json(
        { error: "Please enter the full 6-digit verification code." },
        { status: 400 }
      );
    }

    const isValid = await repo.verifyResetToken(trimmedEmail, cleanCode);

    if (!isValid) {
      const failed = await recordFailedAttempt(trimmedEmail);

      if (failed.isLocked) {
        return NextResponse.json(
          {
            error: "Too many incorrect OTP attempts (5/5). Account locked for 15 minutes.",
            code: "ACCOUNT_LOCKED",
            remainingMinutes: 15,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid or expired 6-digit code. (${failed.attemptsLeft} attempt(s) remaining)`,
          attemptsLeft: failed.attemptsLeft,
        },
        { status: 400 }
      );
    }

    // OTP verified successfully -> clear failed attempts counter
    await resetFailedAttempts(trimmedEmail);

    // Issue a short-lived cryptographic reset ticket (valid for 15 minutes)
    // so the next page does NOT require entering the OTP again!
    const ticket = createResetTicket(trimmedEmail, 15);

    const response = NextResponse.json({
      success: true,
      ticket,
      message: "Code verified successfully! You may now set your new password.",
      redirectTo: `/auth/reset-password?email=${encodeURIComponent(trimmedEmail)}`,
    });

    response.cookies.set("lm_reset_ticket", ticket, {
      path: "/",
      maxAge: 15 * 60, // 15 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify code";
    console.error("[VerifyResetCode] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
