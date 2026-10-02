import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/db/schema";
import type { Clock, IdGenerator } from "@/lib/ports";
import { createAuth } from "@/modules/auth";
import { createCart } from "@/modules/cart";
import { createCatalog } from "@/modules/catalog";
import { createCheckout } from "@/modules/checkout";
import { createOrders } from "@/modules/orders";
import { createSearch } from "@/modules/search";
import type { PaymentProvider } from "@/modules/payments";

/**
 * Driver-agnostic Postgres database. PGlite (local/test) and a production driver
 * (e.g. node-postgres or Neon) both satisfy it; only `runtime.ts` and
 * `test-support/app.ts` know which driver is in use.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export type AppDeps = {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  payments: PaymentProvider;
};

/** Composition root: wires modules together. Used by the runtime and by tests. */
export function createApp({ db, clock, ids, payments }: AppDeps) {
  const catalog = createCatalog({ db });
  const cart = createCart({ db, catalog });
  const orders = createOrders({ db, clock });
  const checkout = createCheckout({ db, cart, catalog, orders, payments, clock, ids });
  const search = createSearch({ catalog });
  const auth = createAuth({ db, clock, ids });
  return { db, catalog, cart, orders, checkout, search, auth };
}

export type App = ReturnType<typeof createApp>;
