import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { createClient } from "@supabase/supabase-js";

// Supabase client instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// PostgreSQL / Drizzle connection
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
      console.warn("Could not connect to PostgreSQL via DATABASE_URL, using memory repository fallback:", e);
    }
  }
  return null;
}
