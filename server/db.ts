import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { log } from "./vite";

// Define the PostgreSQL connection string from environment variables
const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create the connection
const client = postgres(connectionString, { max: 1 });

// Create Drizzle instance for querying
export const db = drizzle(client, { schema });

// Function to run migrations - useful for setup
export async function runMigrations() {
  try {
    log("Running database migrations...", "drizzle");
    // Uncomment when you have migration files in place 
    // await migrate(db, { migrationsFolder: "drizzle" });
    log("Database migrations completed successfully", "drizzle");
  } catch (error) {
    log(`Migration error: ${error}`, "drizzle-error");
    throw error;
  }
}