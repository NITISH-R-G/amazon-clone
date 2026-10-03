import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Written reviews. "Verified purchase" is only ever set by the service, from a delivered order of the signed-in user;
 * a client can never claim it. Plain text keys: other modules own products, variants and users.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: text("product_id").notNull(),
    /** The variant the reviewer bought, when known (verified reviews). */
    variantId: text("variant_id"),
    /** Null for the demo catalogue's seeded reviewers. */
    userId: text("user_id"),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("reviews_product_recent").on(t.productId, t.createdAt)],
);
