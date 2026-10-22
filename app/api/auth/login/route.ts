import { NextRequest, NextResponse } from "next/server";
import { repo, DEMO_USER_ID } from "@/lib/db/repo";
import { createSessionToken } from "@/lib/auth/security";
import { checkLockout, recordFailedAttempt, resetFailedAttempts } from "@/lib/auth/lockout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check 15-minute account lockout (5 failed attempts limit)
    const lockoutStatus = await checkLockout(trimmedEmail);
    if (lockoutStatus.isLocked) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Your account is temporarily locked for ${lockoutStatus.remainingMinutes} more minute(s). Please wait before trying again.`,
          code: "ACCOUNT_LOCKED",
          remainingMinutes: lockoutStatus.remainingMinutes,
        },
        { status: 429 }
      );
    }

    // 2. Authenticate user
    let authenticatedUser: { id: string; email: string; fullName: string } | null = null;

    // Check demo account
    if (trimmedEmail === "demo@lecturemate.ai" && password === "password123") {
      authenticatedUser = {
        id: DEMO_USER_ID,
        email: trimmedEmail,
        fullName: "Demo Student",
      };
    } else {
      // Authenticate against database
      const dbUser = await repo.verifyUserPassword(trimmedEmail, password);

      if (dbUser) {
        // Enforce email verification strictly: New user cannot enter without verifying OTP
        if (dbUser.emailVerified === false) {
          return NextResponse.json(
            {
              error: "Your email has not been verified yet. Please enter the 6-digit verification code sent to your inbox to activate your account.",
              code: "EMAIL_NOT_VERIFIED",
              email: trimmedEmail,
            },
            { status: 403 }
          );
        }

        authenticatedUser = {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
        };
      }
    }

    // 3. Handle failed login
    if (!authenticatedUser) {
      const failed = await recordFailedAttempt(trimmedEmail);

      if (failed.isLocked) {
        return NextResponse.json(
          {
            error: "Too many failed attempts (5/5). Your account has been locked for 15 minutes for security.",
            code: "ACCOUNT_LOCKED",
            remainingMinutes: 15,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid email or password. (${failed.attemptsLeft} attempt(s) remaining before a 15-minute security lockout)`,
          attemptsLeft: failed.attemptsLeft,
        },
        { status: 401 }
      );
    }

    // 4. On successful login: Reset failed attempts counter
    await resetFailedAttempts(trimmedEmail);

    // 5. Generate cryptographically signed session token
    const token = createSessionToken({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      fullName: authenticatedUser.fullName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.fullName,
      },
      redirectTo: "/dashboard",
      message: "Signed in successfully!",
    });

    // 6. Set secure HTTP-only session cookie
    response.cookies.set("lm_session", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("demo_auth_user", authenticatedUser.email, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
