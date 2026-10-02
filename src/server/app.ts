import type { PgliteDatabase } from "drizzle-orm/pglite";
import type * as schema from "@/db/schema";
import type { Clock, IdGenerator } from "@/lib/ports";
import { createCart } from "@/modules/cart";
import { createCatalog } from "@/modules/catalog";
import { createCheckout } from "@/modules/checkout";
import { createOrders } from "@/modules/orders";
import type { PaymentProvider } from "@/modules/payments";

export type Database = PgliteDatabase<typeof schema>;

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
  const orders = createOrders({ db });
  const checkout = createCheckout({ db, cart, catalog, orders, payments, clock, ids });
  return { db, catalog, cart, orders, checkout };
}

export type App = ReturnType<typeof createApp>;
