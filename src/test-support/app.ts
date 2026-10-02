import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { Clock, IdGenerator } from "@/lib/ports";
import type { PaymentProvider } from "@/modules/payments";
import { createApp } from "@/server/app";
import { fakePaymentProvider, fixedClock, fixedIds } from "./fakes";
import { seedFixtures } from "./fixtures";

type Overrides = { clock?: Clock; ids?: IdGenerator; payments?: PaymentProvider };

/**
 * A fresh in-memory Postgres (PGlite) with real migrations and the tracer
 * fixtures. Only the three allowed ports may be overridden.
 */
export async function createTestApp(overrides: Overrides = {}) {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await seedFixtures(db);
  const app = createApp({
    db,
    clock: overrides.clock ?? fixedClock("2026-10-03T12:00:00Z"),
    ids: overrides.ids ?? fixedIds({ orderNumbers: [] }),
    payments:
      overrides.payments ??
      fakePaymentProvider({ status: "approved", reference: "pay-default", brand: "visa", last4: "4242" }),
  });
  return { ...app, close: () => client.close() };
}
