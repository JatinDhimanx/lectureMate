import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { sendVerificationEmail } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
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

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Your email is already verified! You can proceed to log in directly.",
      });
    }

    // Generate fresh verification token
    const token = await repo.createVerificationToken(trimmedEmail);

    // Send verification email via Nodemailer
    await sendVerificationEmail(
      trimmedEmail,
      user.fullName || "Student",
      token,
      origin
    );

    return NextResponse.json({
      success: true,
      message: `A new verification email has been sent to ${trimmedEmail}! Please check your inbox.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to resend verification";
    console.error("[ResendVerification] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
