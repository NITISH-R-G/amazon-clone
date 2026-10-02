import { check, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type ProductImage = { url: string; alt: string };

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  brand: text("brand").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<ProductImage[]>().notNull().default([]),
  // Plain text, not a foreign key declaration needed by other modules; nullable for uncategorised products.
  categoryId: text("category_id"),
  /** Rating in tenths (45 = 4.5) so no float is ever persisted. */
  ratingTenths: integer("rating_tenths").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  featuredRank: integer("featured_rank"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  /** Name of the option the variants differ by (e.g. "Color", "Size"); null when single-variant. */
  optionName: text("option_name"),
});

export const variants = pgTable(
  "variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    label: text("label"),
    priceCents: integer("price_cents").notNull(),
    listPriceCents: integer("list_price_cents"),
    stock: integer("stock").notNull().default(0),
  },
  (t) => [
    check("variants_stock_non_negative", sql`${t.stock} >= 0`),
    check("variants_price_non_negative", sql`${t.priceCents} >= 0`),
  ],
);
