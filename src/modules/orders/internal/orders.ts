import { and, desc, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { actorKey, type Actor } from "@/lib/result";
import { orderItems, orders } from "../schema";
import type { NewOrder, Order } from "../types";

export type OrdersDeps = { db: DbOrTx };

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

function toOrder(row: OrderRow, items: ItemRow[]): Order {
  return {
    id: row.id,
    number: row.number,
    status: "placed",
    items: items
      .filter((i) => i.orderId === row.id)
      .map(({ variantId, title, unitPriceCents, quantity, imageUrl }) => ({
        variantId,
        title,
        unitPriceCents,
        quantity,
        imageUrl,
      })),
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    address: row.address,
    contactEmail: row.contactEmail,
    payment: { reference: row.paymentReference, brand: row.paymentBrand, last4: row.paymentLast4 },
    placedAt: row.placedAt,
  };
}

export function createOrders({ db }: OrdersDeps) {
  async function loadOrders(d: DbOrTx, rows: OrderRow[]): Promise<Order[]> {
    if (rows.length === 0) return [];
    const items = await d
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, rows.map((r) => r.id)));
    return rows.map((row) => toOrder(row, items));
  }

  /** Called by `checkout` only, inside its transaction. */
  async function createOrder(data: NewOrder, tx?: DbOrTx): Promise<Order> {
    const d = tx ?? db;
    const [row] = await d
      .insert(orders)
      .values({
        number: data.number,
        ownerKey: actorKey(data.owner),
        subtotalCents: data.subtotalCents,
        shippingCents: data.shippingCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
        contactEmail: data.contactEmail,
        address: data.address,
        paymentReference: data.payment.reference,
        paymentBrand: data.payment.brand,
        paymentLast4: data.payment.last4,
        idempotencyKey: data.idempotencyKey,
        placedAt: data.placedAt,
      })
      .returning();
    const itemRows = await d
      .insert(orderItems)
      .values(data.items.map((item) => ({ ...item, orderId: row.id })))
      .returning();
    return toOrder(row, itemRows);
  }

  async function listOrders(actor: Actor, tx?: DbOrTx): Promise<Order[]> {
    const d = tx ?? db;
    const rows = await d
      .select()
      .from(orders)
      .where(eq(orders.ownerKey, actorKey(actor)))
      .orderBy(desc(orders.placedAt));
    return loadOrders(d, rows);
  }

  /** Used by `checkout` to make placing an order idempotent. */
  async function findByIdempotencyKey(actor: Actor, key: string, tx?: DbOrTx): Promise<Order | null> {
    const d = tx ?? db;
    const rows = await d
      .select()
      .from(orders)
      .where(and(eq(orders.ownerKey, actorKey(actor)), eq(orders.idempotencyKey, key)))
      .limit(1);
    return (await loadOrders(d, rows))[0] ?? null;
  }

  /** Owner-scoped: another actor's order id yields null. */
  async function getOrder(actor: Actor, id: string, tx?: DbOrTx): Promise<Order | null> {
    const d = tx ?? db;
    const rows = await d
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.ownerKey, actorKey(actor))))
      .limit(1);
    return (await loadOrders(d, rows))[0] ?? null;
  }

  return { createOrder, listOrders, findByIdempotencyKey, getOrder };
}

export type OrdersModule = ReturnType<typeof createOrders>;
