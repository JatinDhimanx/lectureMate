import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { password, confirmPassword, email, token } = await request.json();

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

    // Verify the 6-digit reset OTP code
    const cleanToken = typeof token === "string" ? token.trim() : "";
    if (!cleanToken) {
      return NextResponse.json(
        { error: "Please enter the 6-digit verification code sent to your email." },
        { status: 400 }
      );
    }

    const isTokenValid = await repo.verifyResetToken(targetEmail, cleanToken);
    if (!isTokenValid) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired 6-digit reset code. Please check your email or request a new code.",
        },
        { status: 400 }
      );
    }

    // 1. Update in database repository (cryptographically hashes password & invalidates token)
    const updated = await repo.updateUserPassword(targetEmail, password);
    if (!updated) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // 2. Also sync with Supabase auth if active
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({ password });
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    const response = NextResponse.json({
      success: true,
      message: "Password reset successfully! Please sign in with your new password.",
      redirectTo: `/auth/login?reset=success&email=${encodeURIComponent(targetEmail)}`,
    });

    // Clear all session cookies so user explicitly logs in with their new password
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
