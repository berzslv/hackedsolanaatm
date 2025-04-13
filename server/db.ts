import * as schema from "@shared/schema";

// Dummy implementations for database connection
// All actual data is now stored on-chain
class DummyPool {
  query() {
    return Promise.resolve({ rows: [{ now: new Date() }] });
  }
}

// Mock db interface that does nothing but maintains API compatibility
export const pool = new DummyPool() as any;
export const db = { 
  select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
  insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
  update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
  delete: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
} as any;

// Export a function that can be called to run migrations
export async function runMigrations() {
  console.log("[info] On-chain storage active, database connection not needed");
}