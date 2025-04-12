import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for NeonDB connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a database connection pool
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create a drizzle instance with the schema from shared/schema.ts
export const db = drizzle(pool, { schema });

// Export a function that can be called to run migrations
export async function runMigrations() {
  console.log("[database] Initializing database connection...");
  try {
    // Check db connection
    await pool.query('SELECT NOW()');
    console.log("[database] Database connection established");
  } catch (error) {
    console.error("[database] Database connection failed:", error);
    throw error;
  }
}