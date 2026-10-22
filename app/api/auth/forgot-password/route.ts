import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { sendPasswordResetEmail } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const origin = request.nextUrl.origin;

    const user = await repo.findUserByEmail(trimmedEmail);

    if (user) {
      const resetToken = await repo.createResetToken(trimmedEmail);
      if (resetToken) {
        await sendPasswordResetEmail(
          trimmedEmail,
          user.fullName || "Student",
          resetToken,
          origin
        );
      }
    }

    // Always return a consistent success message for privacy/security
    return NextResponse.json({
      success: true,
      message: `If an account with ${trimmedEmail} exists, password reset instructions have been sent to your email inbox.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process request";
    console.error("[ForgotPassword] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
