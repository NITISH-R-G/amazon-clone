import type { PaymentEvent, PaymentStatus } from "../types";

type State = { status: PaymentStatus; lastEventAt: Date | null };

const OPEN: PaymentStatus[] = ["pending", "requires_action", "processing", "failed"];

const TARGET: Partial<Record<PaymentEvent["type"], PaymentStatus>> = {
  "payment.requires_action": "requires_action",
  "payment.processing": "processing",
  "payment.succeeded": "succeeded",
  "payment.failed": "failed",
  "payment.canceled": "canceled",
};

/**
 * Pure: the next payment state for an incoming event.
 * - Success is accepted from any state except an already succeeded or refunded payment (money moved).
 * - Other changes are accepted only while the payment is open and the event is not older than the last one applied,
 *   so duplicates and out-of-order deliveries can never move a payment backwards.
 * - Refund events apply only to a succeeded payment.
 */
export function applyPaymentEvent(
  current: State,
  event: PaymentEvent,
): { status: PaymentStatus; lastEventAt: Date | null; applied: boolean } {
  const unchanged = { status: current.status, lastEventAt: current.lastEventAt, applied: false };

  if (event.type === "refund.succeeded") {
    if (current.status !== "succeeded" && current.status !== "partially_refunded") return unchanged;
    const total = event.refundTotalCents ?? event.amountCents;
    const full = total === undefined || event.paymentTotalCents === undefined || total >= event.paymentTotalCents;
    return { status: full ? "refunded" : "partially_refunded", lastEventAt: event.occurredAt, applied: true };
  }
  if (event.type === "refund.failed") return unchanged;

  const target = TARGET[event.type];
  if (!target) return unchanged;
  if (target === "succeeded") {
    if (current.status === "succeeded" || current.status === "refunded" || current.status === "partially_refunded") return unchanged;
    return { status: "succeeded", lastEventAt: event.occurredAt, applied: true };
  }
  if (!OPEN.includes(current.status)) return unchanged;
  if (current.lastEventAt && event.occurredAt.getTime() < current.lastEventAt.getTime()) return unchanged;
  if (target === current.status) return { ...unchanged, lastEventAt: event.occurredAt };
  return { status: target, lastEventAt: event.occurredAt, applied: true };
}
