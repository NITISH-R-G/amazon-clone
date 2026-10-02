import { and, eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import type { Clock } from "@/lib/ports";
import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import { paymentEvents, payments, refunds } from "../schema";
import type { PaymentEvent, PaymentProvider, PaymentStatus, RefundOutcome } from "../types";
import { applyPaymentEvent } from "./state";

export type PaymentRecord = {
  id: string;
  orderId: string;
  provider: string;
  providerRef: string;
  status: PaymentStatus;
  amountCents: Cents;
  refundedCents: Cents;
  lastError: string | null;
  brand: string | null;
  last4: string | null;
  lastEventAt: Date | null;
};

export type RefundRecord = { id: string; paymentId: string; orderId: string; amountCents: Cents; status: RefundOutcome["status"] };

type Row = typeof payments.$inferSelect;

const toRecord = (r: Row): PaymentRecord => ({
  id: r.id,
  orderId: r.orderId,
  provider: r.provider,
  providerRef: r.providerRef,
  status: r.status,
  amountCents: r.amountCents,
  refundedCents: r.refundedCents,
  lastError: r.lastError,
  brand: r.brand,
  last4: r.last4,
  lastEventAt: r.lastEventAt,
});

export type PaymentsDeps = { db: DbOrTx; clock: Clock; provider: PaymentProvider };

/**
 * Payments: our record of each provider payment, the events we have processed, and refunds.
 * Provider calls (the network) are made outside database transactions by the caller.
 */
export function createPayments({ db, clock, provider }: PaymentsDeps) {
  async function getByOrder(orderId: string, tx?: DbOrTx): Promise<PaymentRecord | null> {
    const [row] = await (tx ?? db).select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
    return row ? toRecord(row) : null;
  }

  /**
   * Makes sure the provider has a payment for this order (idempotent: the order id is the idempotency key, so a
   * retry returns the same payment) and that we have a record of it. Returns the client secret if the provider has one.
   */
  async function ensureForOrder(input: { orderId: string; amountCents: Cents }): Promise<PaymentRecord & { clientSecret: string | null }> {
    const created = await provider.createPayment({ orderId: input.orderId, amountCents: input.amountCents, idempotencyKey: input.orderId });
    await db
      .insert(payments)
      .values({ orderId: input.orderId, provider: provider.kind, providerRef: created.providerRef, amountCents: input.amountCents })
      .onConflictDoNothing({ target: payments.orderId });
    const record = (await getByOrder(input.orderId)) as PaymentRecord;
    return { ...record, clientSecret: created.clientSecret };
  }

  /**
   * Records a provider event. Duplicates (same event id) change nothing; stale or impossible transitions are
   * ignored by the pure state rules. Unknown payments are rejected without recording anything.
   */
  async function recordEvent(
    event: PaymentEvent,
    tx?: DbOrTx,
  ): Promise<Result<{ payment: PaymentRecord; applied: boolean; duplicate: boolean }, "UNKNOWN_PAYMENT">> {
    const d = tx ?? db;
    const [row] = await d.select().from(payments).where(eq(payments.providerRef, event.providerRef)).limit(1).for("update");
    if (!row) return err("UNKNOWN_PAYMENT");
    const seen = await d
      .insert(paymentEvents)
      .values({ eventId: event.id, paymentId: row.id, type: event.type })
      .onConflictDoNothing()
      .returning({ eventId: paymentEvents.eventId });
    if (seen.length === 0) return ok({ payment: toRecord(row), applied: false, duplicate: true });

    const next = applyPaymentEvent({ status: row.status, lastEventAt: row.lastEventAt }, event);
    const isRefund = event.type === "refund.succeeded";
    const refundedCents = isRefund && next.applied ? (event.refundTotalCents ?? row.refundedCents + (event.amountCents ?? 0)) : row.refundedCents;
    const [updated] = await d
      .update(payments)
      .set({
        status: next.status,
        lastEventAt: next.lastEventAt,
        refundedCents,
        lastError: next.applied ? (event.type === "payment.failed" ? (event.error ?? "payment_failed") : event.type === "payment.succeeded" ? null : row.lastError) : row.lastError,
        brand: next.applied && event.brand ? event.brand : row.brand,
        last4: next.applied && event.last4 ? event.last4 : row.last4,
        updatedAt: clock.now(),
      })
      .where(eq(payments.id, row.id))
      .returning();
    return ok({ payment: toRecord(updated), applied: next.applied, duplicate: false });
  }

  /** Cancels an unpaid payment at the provider (best effort) and in our record. */
  async function cancelForOrder(orderId: string): Promise<void> {
    const payment = await getByOrder(orderId);
    if (!payment || !["pending", "requires_action", "processing", "failed"].includes(payment.status)) return;
    try {
      await provider.cancelPayment(payment.providerRef);
    } catch {
      // The hold and the order are already released; the provider's own expiry will clean up.
    }
    await db.update(payments).set({ status: "canceled", updatedAt: clock.now() }).where(eq(payments.id, payment.id));
  }

  /**
   * Refunds the unrefunded rest of a payment through the provider. The refund row exists (pending) before the
   * provider is asked, its id is the provider idempotency key, and the payment only counts as refunded once the
   * provider says the refund succeeded.
   */
  async function refundRest(orderId: string, reason: string): Promise<RefundRecord | null> {
    const payment = await getByOrder(orderId);
    if (!payment || (payment.status !== "succeeded" && payment.status !== "partially_refunded")) return null;
    const amountCents = payment.amountCents - payment.refundedCents;
    if (amountCents <= 0) return null;
    const [created] = await db.insert(refunds).values({ paymentId: payment.id, orderId, amountCents, reason }).returning();

    let outcome: RefundOutcome;
    try {
      outcome = await provider.refund({ providerRef: payment.providerRef, amountCents, idempotencyKey: created.id });
    } catch {
      outcome = { providerRef: "", status: "failed" };
    }
    await db.update(refunds).set({ status: outcome.status, providerRef: outcome.providerRef || null }).where(eq(refunds.id, created.id));
    if (outcome.status === "succeeded") {
      const refunded = payment.refundedCents + amountCents;
      await db
        .update(payments)
        .set({ refundedCents: refunded, status: refunded >= payment.amountCents ? "refunded" : "partially_refunded", updatedAt: clock.now() })
        .where(and(eq(payments.id, payment.id), sql`${payments.refundedCents} = ${payment.refundedCents}`));
    }
    return { id: created.id, paymentId: payment.id, orderId, amountCents, status: outcome.status };
  }

  return { provider, getByOrder, ensureForOrder, recordEvent, cancelForOrder, refundRest };
}

export type PaymentsService = ReturnType<typeof createPayments>;
