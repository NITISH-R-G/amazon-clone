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
    /** Taken off the items by a coupon; the code is kept for the record. */
    discountCents: integer("discount_cents").notNull().default(0),
    couponCode: text("coupon_code"),
    contactEmail: text("contact_email").notNull(),
    address: jsonb("address").$type<ShippingAddress>().notNull(),
    // Filled when the payment is confirmed; null while the order awaits payment.
    paymentReference: text("payment_reference"),
    paymentBrand: text("payment_brand"),
    paymentLast4: text("payment_last4"),
    idempotencyKey: text("idempotency_key").notNull(),
    /** When the order record was created (checkout started). */
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
    /** When payment was confirmed: the order is "placed" from here and the fulfilment clock starts. Null = awaiting payment. */
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Until when the stock is held for an unpaid order. */
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    /** Money back after a cancellation: pending, refunded or failed. Null when nothing is owed. */
    refundStatus: text("refund_status").$type<"pending" | "refunded" | "failed">(),
    /** Latest seller handling time on the order (minutes): delays every step after "placed". */
    deliveryExtraMinutes: integer("delivery_extra_minutes").notNull().default(0),
    /** Stored lifecycle facts are `paidAt` and `cancelledAt`; every other status is derived from them and the clock. */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
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
  /** Purchase-time snapshot of the variant that was bought. */
  sku: text("sku"),
  variantLabel: text("variant_label"),
  sellerName: text("seller_name"),
  fulfilment: text("fulfilment"),
  offerId: text("offer_id"),
});
