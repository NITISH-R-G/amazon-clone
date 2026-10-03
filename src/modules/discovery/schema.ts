import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Which products an actor (signed-in user or guest) has looked at, most recent first. One row per actor and product;
 * a repeat view only refreshes the time. Plain text keys: other modules own users and products.
 */
export const productViews = pgTable(
  "product_views",
  {
    ownerKey: text("owner_key").notNull(),
    productId: text("product_id").notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull(),
    views: integer("views").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.ownerKey, t.productId] }), index("product_views_owner_recent").on(t.ownerKey, t.viewedAt)],
);
