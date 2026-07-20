import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// In development: always use Replit's managed DATABASE_URL (avoids Supabase credential issues)
// In production: prefer SUPABASE_DATABASE_URL if configured, then fall back to DATABASE_URL
const connectionString =
  process.env.NODE_ENV === "production"
    ? process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isSupabase = connectionString.includes("supabase.com");
console.log(`[db] Using ${isSupabase ? "Supabase" : "Replit"} database`);

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
