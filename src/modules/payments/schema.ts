import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { PaymentStatus } from "./types";

/** One payment per order: our record of what the provider says. The order's own state lives in `orders`. */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Plain text: orders owns orders (module boundary).
  orderId: text("order_id").notNull().unique(),
  provider: text("provider").notNull(),
  /** The provider's id for the payment (a Stripe PaymentIntent id, or a demo id). */
  providerRef: text("provider_ref").notNull().unique(),
  status: text("status").$type<PaymentStatus>().notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  refundedCents: integer("refunded_cents").notNull().default(0),
  lastError: text("last_error"),
  brand: text("brand"),
  last4: text("last4"),
  /** When the newest applied provider event happened: older events are ignored. */
  lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every provider event we have processed, by the provider's event id: duplicate deliveries are ignored. */
export const paymentEvents = pgTable("payment_events", {
  eventId: text("event_id").primaryKey(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id),
  orderId: text("order_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").$type<"pending" | "succeeded" | "failed">().notNull().default("pending"),
  providerRef: text("provider_ref"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
