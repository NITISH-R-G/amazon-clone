import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { ShippingAddress } from "./types";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    ownerKey: text("owner_key").notNull(),
    status: text("status").notNull().default("placed"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    contactEmail: text("contact_email").notNull(),
    address: jsonb("address").$type<ShippingAddress>().notNull(),
    paymentReference: text("payment_reference").notNull(),
    paymentBrand: text("payment_brand").notNull(),
    paymentLast4: text("payment_last4").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
  },
  (t) => [unique("orders_owner_idempotency").on(t.ownerKey, t.idempotencyKey)],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  variantId: text("variant_id").notNull(),
  title: text("title").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  imageUrl: text("image_url"),
});
