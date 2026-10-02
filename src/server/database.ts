import { mkdirSync } from "node:fs";
import * as schema from "@/db/schema";
import { pgliteExtensions } from "@/lib/pglite";
import type { Database } from "./app";

export type Driver = "postgres" | "pglite";

type Env = Record<string, string | undefined>;

/**
 * Managed Postgres exactly when `DATABASE_URL` is set; PGlite (local dev, tests) otherwise.
 * On Vercel PGlite would silently lose state between instances, so a missing URL is an error.
 */
export function selectDriver(env: Env): Driver {
  if (env.DATABASE_URL?.trim()) return "postgres";
  if (env.VERCEL) throw new Error("DATABASE_URL is required on Vercel: PGlite does not persist on serverless hosting.");
  return "pglite";
}

export type DatabaseHandle = {
  db: Database;
  driver: Driver;
  /** Applies `drizzle/*.sql`. Idempotent. */
  migrate: () => Promise<void>;
  close: () => Promise<void>;
};

/** The only place that knows which driver is in use (besides `test-support/app.ts`). */
export async function openDatabase(env: Env = process.env): Promise<DatabaseHandle> {
  const driver = selectDriver(env);

  if (driver === "postgres") {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    // Small pool: serverless instances multiply, and the pooled (pgbouncer) URL does the rest.
    const pool = new Pool({ connectionString: env.DATABASE_URL, max: Number(env.DATABASE_POOL_MAX ?? 3) });
    const db = drizzle(pool, { schema });
    return {
      db,
      driver,
      migrate: () => migrate(db, { migrationsFolder: "./drizzle" }),
      close: () => pool.end(),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // `memory://` (used by E2E) gives a fresh database per server start.
  const dir = env.PGLITE_DIR ?? "data/pglite";
  if (!dir.startsWith("memory://")) mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir, { extensions: pgliteExtensions });
  const db = drizzle(client, { schema });
  return {
    db,
    driver,
    migrate: () => migrate(db, { migrationsFolder: "./drizzle" }),
    close: () => client.close(),
  };
}
