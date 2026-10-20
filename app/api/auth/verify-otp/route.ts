import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/email/otp-service";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP code are required." }, { status: 400 });
    }

    const isValid = verifyOtpCode(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please check again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You may now set your password.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
