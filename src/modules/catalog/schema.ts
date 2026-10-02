import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type ProductImage = { url: string; alt: string };
export type ProductSpec = { label: string; value: string };

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

/** A kind of product (smartphones, sofas, running shoes): the second level of navigation and the owner of its attributes. */
export const productTypes = pgTable("product_types", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: text("category_id").notNull(),
  position: integer("position").notNull().default(0),
});

/**
 * What a product type can say about itself. `role` "variation" attributes are what variants differ by
 * (colour, storage, RAM); "spec" attributes are the technical details. `values` is the ordered vocabulary
 * (empty means free text). `facet` attributes appear as filters when the type is in scope.
 */
export const attributeDefs = pgTable(
  "attribute_defs",
  {
    id: text("id").primaryKey(),
    typeId: text("type_id")
      .notNull()
      .references(() => productTypes.id),
    key: text("key").notNull(),
    label: text("label").notNull(),
    role: text("role").$type<"variation" | "spec">().notNull(),
    facet: boolean("facet").notNull().default(false),
    values: jsonb("values").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
  },
  (t) => [unique("attribute_defs_type_key").on(t.typeId, t.key)],
);

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
  /** Null for hand-made fixtures; the type owns the attribute definitions. */
  typeId: text("type_id").references(() => productTypes.id),
  /** Typed spec values by attribute key, e.g. { processor: "Nexa N4", refresh_rate: "120 Hz" }. */
  attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
  /** Technical details shown as a table on the product page. */
  specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
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
    /** Stock-keeping unit; unique per variant. */
    sku: text("sku").unique(),
    /** The variant's choices by dimension, e.g. { color: "Black", storage: "256 GB", ram: "8 GB" }. */
    selections: jsonb("selections").$type<Record<string, string>>().notNull().default({}),
    /** Pictures for this variant; empty falls back to the product's. */
    images: jsonb("images").$type<ProductImage[]>().notNull().default([]),
    priceCents: integer("price_cents").notNull(),
    listPriceCents: integer("list_price_cents"),
    stock: integer("stock").notNull().default(0),
  },
  (t) => [
    check("variants_stock_non_negative", sql`${t.stock} >= 0`),
    check("variants_price_non_negative", sql`${t.priceCents} >= 0`),
  ],
);

/** A marketplace seller (decision D26). First-party "Cartly" is implicit: it is the variant row itself. */
export const sellers = pgTable("sellers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

/** An additional offer on a variant from a seller. The variant's own price and stock are the first-party offer. */
export const offers = pgTable(
  "offers",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id),
    sellerId: text("seller_id")
      .notNull()
      .references(() => sellers.id),
    priceCents: integer("price_cents").notNull(),
    listPriceCents: integer("list_price_cents"),
    shippingCents: integer("shipping_cents").notNull().default(0),
    /** Minutes before the seller ships; pushes the whole delivery timeline back. */
    handlingMinutes: integer("handling_minutes").notNull().default(0),
    fulfilment: text("fulfilment").$type<"cartly" | "seller">().notNull().default("seller"),
    stock: integer("stock").notNull().default(0),
  },
  (t) => [check("offers_stock_non_negative", sql`${t.stock} >= 0`)],
);

/**
 * A temporary claim on stock while a customer pays (decision D27). While `held` and not yet expired it reduces what
 * other orders can reserve; `committed` means the stock was taken for good; `released` means it was given back.
 * `offer_id` is '' for the first-party unit (the variant itself).
 */
export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: text("order_id").notNull(),
    variantId: text("variant_id").notNull(),
    offerId: text("offer_id").notNull().default(""),
    quantity: integer("quantity").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: text("status").$type<"held" | "committed" | "released">().notNull().default("held"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("stock_reservations_order_unit").on(t.orderId, t.variantId, t.offerId),
    check("stock_reservations_quantity_positive", sql`${t.quantity} > 0`),
    index("stock_reservations_unit_idx").on(t.variantId, t.offerId, t.status),
  ],
);
