import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";
import { createSessionToken } from "@/lib/auth/security";

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

    // 2. Attempt Supabase signUp if configured
    let supabaseSuccess = false;
    let confirmationRequired = false;

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName || trimmedEmail.split("@")[0],
          },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        const isAlreadyRegistered =
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          error.status === 422;

        if (isAlreadyRegistered) {
          return NextResponse.json(
            {
              error: "An account with this email already exists. Please log in instead.",
              code: "USER_ALREADY_EXISTS",
            },
            { status: 409 }
          );
        }
      } else if (data.user) {
        supabaseSuccess = true;
        confirmationRequired = Boolean(data.session === null);
      }
    } catch {
      // Supabase offline / bypass
    }

    // 3. Register user in database repository (passwords cryptographically hashed)
    const newUser = await repo.registerUser({
      email: trimmedEmail,
      password,
      fullName: fullName || trimmedEmail.split("@")[0],
    });

    // 4. Create secure signed session token
    const token = createSessionToken({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.fullName,
      },
      confirmationRequired,
      redirectTo: "/dashboard",
      message: confirmationRequired
        ? "Account created! Please check your email for the verification link."
        : "Account created successfully! Preparing your dashboard...",
    });

    // Set secure HTTP-only session cookie
    response.cookies.set("lm_session", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("demo_auth_user", trimmedEmail, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
