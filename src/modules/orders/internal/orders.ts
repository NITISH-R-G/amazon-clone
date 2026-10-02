import { and, desc, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import type { Clock } from "@/lib/ports";
import { actorKey, err, ok, type Actor, type Result } from "@/lib/result";
import { orderItems, orders } from "../schema";
import type { NewOrder, Order } from "../types";
import { lifecycleOf } from "./lifecycle";

export type OrdersDeps = { db: DbOrTx; clock: Clock };

export type CancelError = "NOT_FOUND" | "NOT_CANCELLABLE";

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

function toOrder(row: OrderRow, items: ItemRow[], now: Date): Order {
  return {
    id: row.id,
    number: row.number,
    items: items
      .filter((i) => i.orderId === row.id)
      .map(({ variantId, title, unitPriceCents, quantity, imageUrl, sku, variantLabel }) => ({
        variantId,
        title,
        unitPriceCents,
        quantity,
        imageUrl,
        sku,
        variantLabel,
      })),
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    address: row.address,
    contactEmail: row.contactEmail,
    payment: { reference: row.paymentReference, brand: row.paymentBrand, last4: row.paymentLast4 },
    placedAt: row.placedAt,
    cancelledAt: row.cancelledAt,
    ...lifecycleOf(row.placedAt, row.cancelledAt, now),
  };
}

export function createOrders({ db, clock }: OrdersDeps) {
  async function loadOrders(d: DbOrTx, rows: OrderRow[]): Promise<Order[]> {
    if (rows.length === 0) return [];
    const items = await d
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, rows.map((r) => r.id)));
    return rows.map((row) => toOrder(row, items, clock.now()));
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
    return toOrder(row, itemRows, clock.now());
  }

  async function listOrders(actor: Actor, tx?: DbOrTx): Promise<Order[]> {
    const d = tx ?? db;
    const rows = await d
      .select()
      .from(orders)
      .where(eq(orders.ownerKey, actorKey(actor)))
      .orderBy(desc(orders.placedAt), desc(orders.number));
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

  /** After sign-in or registration: orders placed as a guest join the account's history. */
  async function claimGuestOrders(guestToken: string, userId: string, tx?: DbOrTx): Promise<void> {
    const d = tx ?? db;
    await d
      .update(orders)
      .set({ ownerKey: actorKey({ userId }) })
      .where(eq(orders.ownerKey, actorKey({ guestToken })));
  }

  /**
   * Cancels an order the actor owns while it is still cancellable. Called by `checkout` inside its
   * transaction (which also puts the stock back). The row is locked so two cancels cannot both win.
   */
  async function cancelOrder(actor: Actor, id: string, tx?: DbOrTx): Promise<Result<Order, CancelError>> {
    const d = tx ?? db;
    const [row] = await d
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.ownerKey, actorKey(actor))))
      .limit(1)
      .for("update");
    if (!row) return err("NOT_FOUND");
    const now = clock.now();
    if (!lifecycleOf(row.placedAt, row.cancelledAt, now).cancellable) return err("NOT_CANCELLABLE");
    const [updated] = await d.update(orders).set({ cancelledAt: now }).where(eq(orders.id, id)).returning();
    const items = await d.select().from(orderItems).where(eq(orderItems.orderId, id));
    return ok(toOrder(updated, items, now));
  }

  return { createOrder, listOrders, findByIdempotencyKey, getOrder, claimGuestOrders, cancelOrder };
}

export type OrdersModule = ReturnType<typeof createOrders>;
