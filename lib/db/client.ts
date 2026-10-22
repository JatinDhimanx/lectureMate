import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { createClient } from "@supabase/supabase-js";

// Supabase client instance (server-side priority: SERVICE_ROLE_KEY > ANON_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "mock-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// PostgreSQL / Drizzle direct connection if available
const connectionString = process.env.DATABASE_URL;

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  if (connectionString && !connectionString.includes("localhost:54322")) {
    try {
      const client = postgres(connectionString, { prepare: false });
      dbInstance = drizzle(client, { schema });
      return dbInstance;
    } catch (e) {
      console.warn("Could not connect to PostgreSQL via DATABASE_URL:", e);
    }
  }
  return null;
}
