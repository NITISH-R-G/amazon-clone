import { check, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type ProductImage = { url: string; alt: string };

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  brand: text("brand").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<ProductImage[]>().notNull().default([]),
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
