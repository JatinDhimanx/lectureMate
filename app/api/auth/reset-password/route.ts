import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";

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
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    // Try Supabase auth updateUser if session active from reset link
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({ password });
    } catch {
      // ignore
    }

    // Also update in repo store
    const user = await getCurrentUser();
    const targetEmail = email || user?.email;
    if (targetEmail) {
      await repo.updateUserPassword(targetEmail, password);
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
