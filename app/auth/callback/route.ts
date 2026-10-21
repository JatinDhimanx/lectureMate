import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?verified=error&error=${encodeURIComponent(error_description || error)}`
    );
  }

  const supabase = await createClient();
  let userEmail: string | null = null;
  let fullName: string = "";

  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError && data?.user?.email) {
      userEmail = data.user.email.toLowerCase().trim();
      fullName =
        (data.user.user_metadata?.full_name as string) ||
        userEmail.split("@")[0];
    }
  } else if (token_hash && type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: otpError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (!otpError && data?.user?.email) {
      userEmail = data.user.email.toLowerCase().trim();
      fullName =
        (data.user.user_metadata?.full_name as string) ||
        userEmail.split("@")[0];
    }
  }

  if (userEmail) {
    // 1. Check if this is a Password Recovery flow
    const isRecovery =
      type === "recovery" ||
      next?.includes("reset-password") ||
      searchParams.get("type") === "recovery";

    if (isRecovery) {
      return NextResponse.redirect(
        `${origin}/auth/reset-password?email=${encodeURIComponent(userEmail)}`
      );
    }

    // 2. Email verification / signup confirmation flow
    const existing = await repo.findUserByEmail(userEmail);
    if (!existing) {
      await repo.registerUser({
        email: userEmail,
        password: "", // User authenticated securely via Supabase
        fullName,
      });
    }

    // Ensure session is cleared so user logs in cleanly via the login page
    try {
      await supabase.auth.signOut();
    } catch {}

    const response = NextResponse.redirect(
      `${origin}/auth/verified?email=${encodeURIComponent(userEmail)}`
    );

    // Clear stale cookies so user goes through standard login
    response.cookies.set("lm_session", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
    });
    response.cookies.set("demo_auth_user", "", {
      path: "/",
      maxAge: 0,
      httpOnly: false,
    });

    return response;
  }

  // If error or code missing/invalid, redirect to login with verification notification
  return NextResponse.redirect(`${origin}/auth/login?verified=error`);
}

