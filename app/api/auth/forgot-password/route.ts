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

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. Please sign up first." },
        { status: 404 }
      );
    }

    const resetToken = await repo.createResetToken(trimmedEmail);
    let delivered = false;
    if (resetToken) {
      const mailResult = await sendPasswordResetEmail(
        trimmedEmail,
        user.fullName || "Student",
        resetToken,
        origin
      );
      delivered = Boolean(mailResult.delivered);
    }

    return NextResponse.json({
      success: true,
      delivered,
      message: `A 6-digit password reset code has been sent to ${trimmedEmail}! Please check your inbox and spam folder.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process request";
    console.error("[ForgotPassword] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
