import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true, message: "Logged out" });
    response.cookies.delete("demo_auth_user");
    return response;
  } catch (err: unknown) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("demo_auth_user");
    return response;
  }
}
