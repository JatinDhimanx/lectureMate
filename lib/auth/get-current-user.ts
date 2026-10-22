import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifySessionToken } from "./security";
import { repo, toValidUuid, DEMO_USER_ID } from "@/lib/db/repo";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();

  // 1. Check cryptographically signed session cookie (lm_session)
  const sessionCookie = cookieStore.get("lm_session")?.value;
  if (sessionCookie) {
    const verified = verifySessionToken(sessionCookie);
    if (verified) {
      // Validate with user store to ensure user exists
      const dbUser = await repo.findUserByEmail(verified.email);
      return {
        id: dbUser ? dbUser.id : toValidUuid(verified.userId),
        email: verified.email,
        name: dbUser ? dbUser.fullName : verified.name,
      };
    }
  }

  // 2. Try Supabase user session
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.email) {
      const email = user.email.toLowerCase().trim();
      const dbUser = await repo.findUserByEmail(email);
      return {
        id: dbUser ? dbUser.id : toValidUuid(user.id),
        email,
        name:
          dbUser?.fullName ||
          user.user_metadata?.full_name ||
          email.split("@")[0] ||
          "Student",
      };
    }
  } catch {
    // ignore supabase error and try fallback
  }

  // 3. Fallback demo_auth_user cookie for backward compatibility
  const demoEmail = cookieStore.get("demo_auth_user")?.value;
  if (demoEmail) {
    const normalized = demoEmail.toLowerCase().trim();
    const dbUser = await repo.findUserByEmail(normalized);

    return {
      id: dbUser ? dbUser.id : DEMO_USER_ID,
      email: normalized,
      name: dbUser ? dbUser.fullName : normalized.split("@")[0],
    };
  }

  return null;
}
