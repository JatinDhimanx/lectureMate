import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { repo } from "@/lib/db/repo";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user?.email) {
      const email = data.user.email.toLowerCase().trim();
      const fullName =
        (data.user.user_metadata?.full_name as string) ||
        email.split("@")[0];

      // STORE IN DB AFTER EMAIL VERIFICATION IS CONFIRMED!
      const existing = await repo.findUserByEmail(email);
      if (!existing) {
        await repo.registerUser({
          email,
          password: "", // User authenticated securely via Supabase session
          fullName,
        });
      }

      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set("demo_auth_user", email, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false,
        sameSite: "lax",
      });
      return response;
    }
  }

  // If error or code missing, redirect to login with verification notification
  return NextResponse.redirect(`${origin}/auth/login?verified=error`);
}
