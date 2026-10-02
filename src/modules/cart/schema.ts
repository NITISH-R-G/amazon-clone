import { check, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** `guest:<token>` or `user:<id>` (see lib/result.ts actorKey). */
  actorKey: text("actor_key").notNull().unique(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id),
    // Plain text, not a foreign key: catalog owns variants (module boundary).
    variantId: text("variant_id").notNull(),
    // Plain text: catalog owns offers. Empty string means the first-party offer (the variant itself).
    offerId: text("offer_id").notNull().default(""),
    quantity: integer("quantity").notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (t) => [
    check("cart_items_quantity_positive", sql`${t.quantity} >= 1`),
    unique("cart_items_cart_variant_offer").on(t.cartId, t.variantId, t.offerId),
  ],
);
