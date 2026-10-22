import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { checkLockout, recordFailedAttempt, resetFailedAttempts } from "@/lib/auth/lockout";
import { verifyResetTicket } from "@/lib/auth/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { password, confirmPassword, email, token, ticket } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match. Please re-enter." },
        { status: 400 }
      );
    }

    // Determine target email
    const currentUser = await getCurrentUser();
    const targetEmail = (email || currentUser?.email)?.toLowerCase().trim();

    if (!targetEmail) {
      return NextResponse.json(
        { error: "No account email specified for password reset." },
        { status: 400 }
      );
    }

    // 1. Check 15-minute security lockout
    const lockout = await checkLockout(targetEmail);
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

    // 2. Validate OTP authorization
    // Either through the verified reset ticket (already verified OTP) or explicit token
    const cookieStore = await cookies();
    const cookieTicket = cookieStore.get("lm_reset_ticket")?.value;
    const providedTicket = ticket || cookieTicket;

    let isAuthorized = false;

    if (providedTicket && verifyResetTicket(providedTicket, targetEmail)) {
      isAuthorized = true;
    } else if (token && typeof token === "string" && token.trim().length === 6) {
      const isTokenValid = await repo.verifyResetToken(targetEmail, token.trim());
      if (isTokenValid) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const failed = await recordFailedAttempt(targetEmail);
      if (failed.isLocked) {
        return NextResponse.json(
          {
            error: "Too many failed attempts (5/5). Your account has been locked for 15 minutes.",
            code: "ACCOUNT_LOCKED",
            remainingMinutes: 15,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Reset session expired or invalid. Please verify your 6-digit code again.",
        },
        { status: 401 }
      );
    }

    // 3. Reset failed attempts counter on success
    await resetFailedAttempts(targetEmail);

    // 4. Update password in Supabase database directly (cryptographically hashes & invalidates OTP)
    const updated = await repo.updateUserPassword(targetEmail, password);
    if (!updated) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Password reset successfully! Please sign in with your new password.",
      redirectTo: `/auth/login?reset=success&email=${encodeURIComponent(targetEmail)}`,
    });

    // Clear reset ticket and previous sessions
    response.cookies.set("lm_reset_ticket", "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("lm_session", "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("demo_auth_user", "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset password";
    console.error("[ResetPassword] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
