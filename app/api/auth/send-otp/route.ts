import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreOtp, sendOtpEmail } from "@/lib/email/otp-service";

export async function POST(request: NextRequest) {
  try {
    const { email, type = "signup" } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const otp = generateAndStoreOtp(trimmedEmail);

    // Dispatches OTP strictly to the user's email address
    await sendOtpEmail(trimmedEmail, otp, type);

    // Return standard success message WITHOUT exposing the OTP in the API response
    return NextResponse.json({
      success: true,
      message: `A verification code has been sent to ${trimmedEmail}. Please check your email inbox.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to send verification code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
