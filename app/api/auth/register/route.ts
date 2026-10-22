import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // 1. Check if user is already registered in local database
    const existingUser = await repo.findUserByEmail(trimmedEmail);
    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists. Please log in instead.",
          code: "USER_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    // 2. Register user in database repository (unverified by default until email confirmation)
    const newUser = await repo.registerUser({
      email: trimmedEmail,
      password,
      fullName: displayName,
      emailVerified: false,
    });

    // 3. Generate verification token in database
    const verificationToken = await repo.createVerificationToken(trimmedEmail);

    // 4. Send verification email via Nodemailer
    try {
      await sendVerificationEmail(
        trimmedEmail,
        displayName,
        verificationToken,
        origin
      );
    } catch (mailErr) {
      console.error("[Register] Failed to send verification email:", mailErr);
    }

    // 5. Optionally sync with Supabase in the background (non-blocking, ignore Resend/provider errors)
    try {
      const supabase = await createClient();
      await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: displayName },
        },
      });
    } catch {
      // Supabase offline or third-party email provider error, ignored safely
    }

    // 6. Return response indicating verification email has been sent
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.fullName,
      },
      confirmationRequired: true,
      redirectTo: "/auth/login",
      message: `Account created! A verification link and code have been sent to ${trimmedEmail}. Please check your inbox and verify your email before logging in.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    console.error("[Register] Internal error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
