import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to update your password." },
        { status: 401 }
      );
    }

    const { newPassword, confirmPassword } = await request.json();

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    // 1. Update in Supabase if session exists
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({ password: newPassword });
    } catch {
      // Supabase update failed or running demo session
    }

    // 2. Update in persistent repo store
    await repo.updateUserPassword(user.email, newPassword);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully!",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update password.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
