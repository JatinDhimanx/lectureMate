import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { sendVerificationEmail } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const origin = request.nextUrl.origin;
    const displayName = fullName?.trim() || trimmedEmail.split("@")[0];

    // 1. Check if user already exists
    const existingUser = await repo.findUserByEmail(trimmedEmail);
    if (existingUser) {
      if (!existingUser.emailVerified) {
        // User exists but unverified: send a fresh OTP via Nodemailer
        const token = await repo.createVerificationToken(trimmedEmail);
        const mailResult = await sendVerificationEmail(trimmedEmail, displayName, token, origin);
        return NextResponse.json({
          success: true,
          email: trimmedEmail,
          confirmationRequired: true,
          delivered: mailResult.delivered,
          message: `Your account is pending verification. A fresh 6-digit verification code has been sent to ${trimmedEmail} (check your inbox or spam folder).`,
        });
      }

      return NextResponse.json(
        {
          error: "An account with this email already exists. Please log in instead.",
          code: "USER_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    // 2. Generate secure 6-digit OTP
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Register user as unverified in Supabase database
    const newUser = await repo.registerUser({
      email: trimmedEmail,
      password,
      fullName: displayName,
      emailVerified: false,
      verificationToken,
    });

    // 4. Send 6-digit OTP strictly via Nodemailer
    const mailResult = await sendVerificationEmail(
      trimmedEmail,
      displayName,
      verificationToken,
      origin
    );

    // 5. Return success
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.fullName,
      },
      confirmationRequired: true,
      delivered: mailResult.delivered,
      message: `Account created! A 6-digit verification code has been sent to ${trimmedEmail}. Please check your inbox or spam folder.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    console.error("[Register] Internal error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
