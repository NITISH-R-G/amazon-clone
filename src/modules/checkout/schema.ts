import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Coupons: a code, a discount and when it is valid. Prices are only ever reduced by the server, from this table;
 * the client sends a code, never an amount. (Deals are different: they are list-price reductions on the offer itself.)
 */
export const promotions = pgTable("promotions", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  kind: text("kind").$type<"percent" | "fixed">().notNull(),
  /** Percent (1-100) or cents, by kind. */
  value: integer("value").notNull(),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
});
