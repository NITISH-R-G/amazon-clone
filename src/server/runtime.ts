import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { seedDemoCatalog } from "@/db/seed-demo";
import { createSystemIds, systemClock } from "@/lib/ports";
import { createDemoProvider } from "@/modules/payments";
import { createApp, type App } from "./app";

// One app per server process (survives dev hot reloads).
const globalForApp = globalThis as unknown as { __app?: Promise<App> };

async function init(): Promise<App> {
  // `memory://` (used by E2E) gives a fresh database per server start.
  const dir = process.env.PGLITE_DIR ?? "data/pglite";
  if (!dir.startsWith("memory://")) mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await seedDemoCatalog(db);
  const ids = createSystemIds();
  return createApp({ db, clock: systemClock, ids, payments: createDemoProvider({ clock: systemClock, ids }) });
}

export function getApp(): Promise<App> {
  if (!globalForApp.__app) {
    const started = init();
    // Do not cache a failed start: the next request retries.
    started.catch(() => {
      if (globalForApp.__app === started) globalForApp.__app = undefined;
    });
    globalForApp.__app = started;
  }
  return globalForApp.__app;
}
