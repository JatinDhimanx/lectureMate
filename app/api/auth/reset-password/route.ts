import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createSessionToken } from "@/lib/auth/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { password, confirmPassword, email } = await request.json();

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

    // 1. Update in database repository (hashes password & updates passwordResetAt column)
    const updated = await repo.updateUserPassword(targetEmail, password);
    if (!updated) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // 2. Also update in Supabase auth if active
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({ password });
    } catch {
      // ignore
    }

    // 3. Immediately log in user with fresh secure session token
    const dbUser = await repo.findUserByEmail(targetEmail);
    const token = createSessionToken({
      id: dbUser ? dbUser.id : `usr_${Buffer.from(targetEmail).toString("hex").slice(0, 16)}`,
      email: targetEmail,
      fullName: dbUser?.fullName,
    });

    const response = NextResponse.json({
      success: true,
      message: "Password reset successfully! Your new password is now active in the database.",
      redirectTo: "/dashboard",
    });

    response.cookies.set("lm_session", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("demo_auth_user", targetEmail, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
