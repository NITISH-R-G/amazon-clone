import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

/**
 * A minimal sponsored-placement campaign (invented; not Amazon's advertising system). A campaign promotes one product
 * in one placement while it is active and has budget left. It never touches organic ranking: sponsored products are
 * returned separately and always shown labelled.
 */
export const sponsoredCampaigns = pgTable(
  "sponsored_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: text("product_id").notNull(),
    placement: text("placement").$type<"search" | "home">().notNull(),
    /** Lower-case words; a search query that starts a keyword (or is started by it) targets this campaign. */
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    bidCents: integer("bid_cents").notNull(),
    budgetCents: integer("budget_cents").notNull(),
    spentCents: integer("spent_cents").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sponsored_placement").on(t.placement, t.endsAt)],
);
