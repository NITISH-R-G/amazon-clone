import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import type { Clock } from "@/lib/ports";
import { actorKey, err, ok, type Actor, type Result } from "@/lib/result";
import { orderItems, orders } from "../schema";
import type { NewOrder, Order, RefundStatus } from "../types";
import { lifecycleOf, unpaidLifecycle } from "./lifecycle";

export type OrdersDeps = { db: DbOrTx; clock: Clock };

export type CancelError = "NOT_FOUND" | "NOT_CANCELLABLE";

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

function toOrder(row: OrderRow, items: ItemRow[], now: Date): Order {
  // Paid orders follow the fulfilment clock from the moment of payment; unpaid ones have no fulfilment yet.
  const lifecycle = row.paidAt
    ? lifecycleOf(row.paidAt, row.cancelledAt, now, row.deliveryExtraMinutes)
    : unpaidLifecycle(row.placedAt, row.cancelledAt, row.holdExpiresAt, now);
  return {
    id: row.id,
    number: row.number,
    items: items
      .filter((i) => i.orderId === row.id)
      .map(({ variantId, title, unitPriceCents, quantity, imageUrl, sku, variantLabel, sellerName, fulfilment, offerId }) => ({
        variantId,
        title,
        unitPriceCents,
        quantity,
        imageUrl,
        sku,
        variantLabel,
        sellerName: sellerName ?? "Cartly",
        fulfilment: fulfilment === "seller" ? ("seller" as const) : ("cartly" as const),
        offerId,
      })),
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    address: row.address,
    contactEmail: row.contactEmail,
    payment:
      row.paymentReference && row.paymentBrand && row.paymentLast4
        ? { reference: row.paymentReference, brand: row.paymentBrand, last4: row.paymentLast4 }
        : null,
    placedAt: row.placedAt,
    paidAt: row.paidAt,
    holdExpiresAt: row.holdExpiresAt,
    refundStatus: row.refundStatus,
    deliveryExtraMinutes: row.deliveryExtraMinutes,
    cancelledAt: row.cancelledAt,
    ...lifecycle,
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

  /** Called by `checkout` only, inside its transaction. The order starts awaiting payment. */
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
        idempotencyKey: data.idempotencyKey,
        placedAt: data.placedAt,
        holdExpiresAt: data.holdExpiresAt,
        deliveryExtraMinutes: data.deliveryExtraMinutes,
      })
      .returning();
    const itemRows = await d
      .insert(orderItems)
      .values(data.items.map((item) => ({ ...item, orderId: row.id })))
      .returning();
    return toOrder(row, itemRows, clock.now());
  }

  /** An actor's order history: orders that were paid. Unpaid checkouts are not history (pass `includeUnpaid` for them). */
  async function listOrders(actor: Actor, options: { includeUnpaid?: boolean } = {}, tx?: DbOrTx): Promise<Order[]> {
    const d = tx ?? db;
    const rows = await d
      .select()
      .from(orders)
      .where(and(eq(orders.ownerKey, actorKey(actor)), options.includeUnpaid ? undefined : isNotNull(orders.paidAt)))
      .orderBy(desc(orders.placedAt), desc(orders.number));
    return loadOrders(d, rows);
  }

  /** The actor's unpaid, not cancelled orders (abandoned checkouts). */
  async function listAwaiting(actor: Actor, tx?: DbOrTx): Promise<Order[]> {
    const d = tx ?? db;
    const rows = await d
      .select()
      .from(orders)
      .where(and(eq(orders.ownerKey, actorKey(actor)), isNull(orders.paidAt), isNull(orders.cancelledAt)));
    return loadOrders(d, rows);
  }

  /** Used by `checkout` to make starting a checkout idempotent. */
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

  /** For `checkout`'s own orchestration (payment events know an order id, not an actor). Locks the row when asked. */
  async function getOrderById(id: string, tx?: DbOrTx, options: { lock?: boolean } = {}): Promise<{ order: Order; ownerKey: string } | null> {
    const d = tx ?? db;
    const query = d.select().from(orders).where(eq(orders.id, id)).limit(1);
    const rows = options.lock ? await query.for("update") : await query;
    const order = (await loadOrders(d, rows))[0];
    return order ? { order, ownerKey: rows[0].ownerKey } : null;
  }

  /** Payment confirmed: the order is placed and the fulfilment clock starts. Idempotent. */
  async function markPaid(
    id: string,
    paid: { paidAt: Date; reference: string; brand: string; last4: string },
    tx?: DbOrTx,
  ): Promise<void> {
    await (tx ?? db)
      .update(orders)
      .set({ paidAt: paid.paidAt, paymentReference: paid.reference, paymentBrand: paid.brand, paymentLast4: paid.last4 })
      .where(and(eq(orders.id, id), isNull(orders.paidAt)));
  }

  /** Extends the stock hold of an unpaid order and refreshes the contact details given at checkout. */
  async function renewCheckout(
    id: string,
    data: { holdExpiresAt: Date; address: Order["address"]; contactEmail: string },
    tx?: DbOrTx,
  ): Promise<void> {
    await (tx ?? db)
      .update(orders)
      .set({ holdExpiresAt: data.holdExpiresAt, address: data.address, contactEmail: data.contactEmail })
      .where(and(eq(orders.id, id), isNull(orders.paidAt)));
  }

  /** System cancellation of an order (abandoned, or its stock was lost): no cancel window applies. */
  async function cancelById(id: string, tx?: DbOrTx): Promise<void> {
    await (tx ?? db).update(orders).set({ cancelledAt: clock.now() }).where(and(eq(orders.id, id), isNull(orders.cancelledAt)));
  }

  async function setRefundStatus(id: string, status: RefundStatus | null, tx?: DbOrTx): Promise<void> {
    await (tx ?? db).update(orders).set({ refundStatus: status }).where(eq(orders.id, id));
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
   * Cancels an order the actor owns while it is still cancellable: an unpaid order any time, a paid one until it
   * ships. Called by `checkout` inside its transaction (which also releases or restocks and, if paid, refunds).
   * The row is locked so two cancels cannot both win.
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
    const current = toOrder(row, [], now);
    // An expired unpaid order can still be cancelled (it is only tidying up); a cancelled or shipped one cannot.
    const cancellable = row.paidAt ? current.cancellable : !row.cancelledAt;
    if (!cancellable) return err("NOT_CANCELLABLE");
    const [updated] = await d.update(orders).set({ cancelledAt: now }).where(eq(orders.id, id)).returning();
    const items = await d.select().from(orderItems).where(eq(orderItems.orderId, id));
    return ok(toOrder(updated, items, now));
  }

  return {
    createOrder,
    listOrders,
    listAwaiting,
    findByIdempotencyKey,
    getOrder,
    getOrderById,
    markPaid,
    renewCheckout,
    cancelById,
    setRefundStatus,
    claimGuestOrders,
    cancelOrder,
  };
}

export type OrdersModule = ReturnType<typeof createOrders>;
