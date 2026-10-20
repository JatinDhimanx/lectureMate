import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();

  // 1. Try Supabase user session first
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.email) {
      return {
        id: user.id,
        email: user.email,
        name:
          user.user_metadata?.full_name ||
          user.email.split("@")[0] ||
          "Student",
      };
    }
  } catch {
    // ignore supabase error and try cookie fallback
  }

  // 2. Check demo_auth_user cookie
  const demoEmail = cookieStore.get("demo_auth_user")?.value;
  if (demoEmail) {
    const normalized = demoEmail.toLowerCase().trim();
    // Consistent unique ID for each email
    const hexId = Buffer.from(normalized).toString("hex").slice(0, 16);
    return {
      id: `usr_${hexId}`,
      email: normalized,
      name: normalized.split("@")[0],
    };
  }

  return null;
}
