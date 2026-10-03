import { seedDemoCatalog } from "@/db/seed-demo";
import { createSystemIds, systemClock } from "@/lib/ports";
import { createDemoProvider, createStripeProvider } from "@/modules/payments";
import { createApp, type App } from "./app";
import { openDatabase } from "./database";

// One app per server process (survives dev hot reloads).
const globalForApp = globalThis as unknown as { __app?: Promise<App> };

async function init(): Promise<App> {
  const handle = await openDatabase();
  // Managed Postgres is migrated and seeded at deploy time (`pnpm db:setup`), never on a request.
  // PGlite is private to this process, so it is prepared here.
  if (handle.driver === "pglite") {
    await handle.migrate();
    await seedDemoCatalog(handle.db);
  }
  const ids = createSystemIds();
  return createApp({
    db: handle.db,
    clock: systemClock,
    ids,
    // Stripe (test mode) when its secret key is configured; the demo bank otherwise (local dev, tests).
    payments: process.env.STRIPE_SECRET_KEY
      ? createStripeProvider({ secretKey: process.env.STRIPE_SECRET_KEY, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null })
      : createDemoProvider({ clock: systemClock, ids }),
  });
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
