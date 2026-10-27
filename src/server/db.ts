import "server-only";
import { createDatabase, type Database } from "./database";

// One database handle per server process. Cached on globalThis so Next.js
// dev-mode hot reloads don't open a new connection on every change.
const globalForDb = globalThis as unknown as { ajaiaDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  if (!globalForDb.ajaiaDb) {
    globalForDb.ajaiaDb = createDatabase(process.env.DATABASE_URL).catch((err) => {
      globalForDb.ajaiaDb = undefined;
      throw err;
    });
  }
  return globalForDb.ajaiaDb;
}
