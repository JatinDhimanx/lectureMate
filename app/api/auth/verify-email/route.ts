import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Handle one-click verification link from email
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    if (!token || !email) {
      return NextResponse.redirect(
        new URL("/auth/login?verified=error", request.nextUrl.origin)
      );
    }

    const verified = await repo.verifyEmailByToken(email, token);

    if (verified) {
      return NextResponse.redirect(
        new URL(
          `/auth/verified?email=${encodeURIComponent(email)}`,
          request.nextUrl.origin
        )
      );
    } else {
      return NextResponse.redirect(
        new URL(
          `/auth/login?verified=error&email=${encodeURIComponent(email)}`,
          request.nextUrl.origin
        )
      );
    }
  } catch (err) {
    console.error("[VerifyEmail] Error verifying token:", err);
    return NextResponse.redirect(
      new URL("/auth/login?verified=error", request.nextUrl.origin)
    );
  }
}

// Handle manual 6-digit code verification POST request
export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const verified = await repo.verifyEmailByToken(email, token);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please check and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You may now log in to your account.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
