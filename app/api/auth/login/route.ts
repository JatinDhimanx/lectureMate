import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Authenticate with Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    // If Supabase authentication returned an error
    if (error) {
      const isUnconfirmed =
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("not confirmed") ||
        error.message.toLowerCase().includes("unconfirmed");

      // STRICT CHECK: If email is not confirmed, DO NOT let user log in!
      if (isUnconfirmed) {
        return NextResponse.json(
          {
            error: "Email not verified! Please check your email inbox and click the verification link sent by Supabase before logging in.",
            code: "EMAIL_NOT_VERIFIED",
            email: trimmedEmail,
          },
          { status: 403 }
        );
      }

      // Allow demo user only for testing/demo credentials
      if (trimmedEmail === "demo@lecturemate.ai" && password === "password123") {
        const response = NextResponse.json({
          success: true,
          user: {
            id: "demo-user-id",
            email: trimmedEmail,
            user_metadata: { full_name: "Demo Student" },
          },
          message: "Signed in as demo student",
        });
        response.cookies.set("demo_auth_user", trimmedEmail, {
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: false,
          sameSite: "lax",
        });
        return response;
      }

      // Check registered users in repo store (for password verification if offline)
      const localUser = await repo.verifyUserPassword(trimmedEmail, password);
      if (localUser) {
        const response = NextResponse.json({
          success: true,
          user: {
            id: localUser.id,
            email: localUser.email,
            user_metadata: { full_name: localUser.fullName },
          },
          message: "Signed in successfully!",
        });
        response.cookies.set("demo_auth_user", trimmedEmail, {
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: false,
          sameSite: "lax",
        });
        return response;
      }

      return NextResponse.json(
        { error: error.message || "Invalid email or password." },
        { status: 401 }
      );
    }

    // Supabase signIn succeeded! Email is verified!
    // NOW store verified user into DB (repo) if not already present
    const existing = await repo.findUserByEmail(trimmedEmail);
    if (!existing) {
      await repo.registerUser({
        email: trimmedEmail,
        password,
        fullName:
          data.user?.user_metadata?.full_name || trimmedEmail.split("@")[0],
      });
    }

    const response = NextResponse.json({
      success: true,
      user: data.user,
      message: "Logged in successfully!",
    });

    response.cookies.set("demo_auth_user", trimmedEmail, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
