import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanCode = typeof code === "string" ? code.trim() : "";
    if (!cleanCode || cleanCode.length < 6) {
      return NextResponse.json(
        { error: "Please enter the full 6-digit verification code." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const isValid = await repo.verifyResetToken(trimmedEmail, cleanCode);

    if (!isValid) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired 6-digit code. Please verify the code in your email or request a new one.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Code verified successfully!",
      redirectTo: `/auth/reset-password?email=${encodeURIComponent(trimmedEmail)}&token=${encodeURIComponent(cleanCode)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify code";
    console.error("[VerifyResetCode] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
