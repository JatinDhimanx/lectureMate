import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const protectedPaths = [
    "/dashboard",
    "/upload",
    "/study",
    "/quiz",
    "/lectures",
    "/map",
    "/settings",
  ];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // 1. Attempt Supabase authentication if env credentials exist
  let supabaseUser = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      supabaseUser = data?.user || null;
    } catch {
      // Supabase offline/error fallback
    }
  }

  // 2. Check signed session cookie & demo cookie
  const sessionCookie = request.cookies.get("lm_session")?.value?.trim();
  const demoAuthCookie = request.cookies.get("demo_auth_user")?.value?.trim();
  const hasValidSession = Boolean(
    supabaseUser ||
      (sessionCookie && sessionCookie.length > 10) ||
      (demoAuthCookie && demoAuthCookie.length > 3)
  );

  // 3. For ALL protected routes, strictly disable bfcache and browser caching
  if (isProtected) {
    supabaseResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    supabaseResponse.headers.set("Pragma", "no-cache");
    supabaseResponse.headers.set("Expires", "0");
  }

  // 4. If user is trying to access protected area without active session, redirect to login
  if (isProtected && !hasValidSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    redirectResponse.headers.set("Pragma", "no-cache");
    redirectResponse.headers.set("Expires", "0");
    return redirectResponse;
  }

  // 5. If user is authenticated and visits login/signup, redirect to dashboard
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup";
  const hasAuthActionParam =
    request.nextUrl.searchParams.has("verified") ||
    request.nextUrl.searchParams.has("reset") ||
    request.nextUrl.searchParams.has("logged_out");

  if (hasValidSession && isAuthPage && !hasAuthActionParam) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
