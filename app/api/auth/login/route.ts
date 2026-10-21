import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";
import { createSessionToken } from "@/lib/auth/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Authenticate with Supabase if configured
    let authenticatedUser: { id: string; email: string; fullName: string } | null = null;
    let authError: string | null = null;

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!error && data.user && data.user.email) {
        authenticatedUser = {
          id: data.user.id,
          email: data.user.email.toLowerCase().trim(),
          fullName: data.user.user_metadata?.full_name || trimmedEmail.split("@")[0],
        };
      } else if (error) {
        const isUnconfirmed =
          error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("not confirmed") ||
          error.message.toLowerCase().includes("unconfirmed");

        if (isUnconfirmed) {
          return NextResponse.json(
            {
              error: "Email not verified. Please check your inbox and verify your email before logging in.",
              code: "EMAIL_NOT_VERIFIED",
              email: trimmedEmail,
            },
            { status: 403 }
          );
        }
        authError = error.message;
      }
    } catch {
      // Supabase unavailable / offline
    }

    // 2. Authenticate against local database repo
    if (!authenticatedUser) {
      // Check seeded demo account
      if (trimmedEmail === "demo@lecturemate.ai" && password === "password123") {
        authenticatedUser = {
          id: "demo-user-id",
          email: trimmedEmail,
          fullName: "Demo Student",
        };
      } else {
        const localUser = await repo.verifyUserPassword(trimmedEmail, password);
        if (localUser) {
          authenticatedUser = {
            id: localUser.id,
            email: localUser.email,
            fullName: localUser.fullName,
          };
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    // Ensure user is recorded in local repository
    const existing = await repo.findUserByEmail(authenticatedUser.email);
    if (!existing) {
      await repo.registerUser({
        email: authenticatedUser.email,
        password,
        fullName: authenticatedUser.fullName,
      });
    }

    // Generate cryptographically signed session token
    const token = createSessionToken({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      fullName: authenticatedUser.fullName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.fullName,
      },
      redirectTo: "/dashboard",
      message: "Signed in successfully!",
    });

    // Set secure HTTP-only session cookie
    response.cookies.set("lm_session", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Fallback cookie for client-side routing
    response.cookies.set("demo_auth_user", authenticatedUser.email, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
