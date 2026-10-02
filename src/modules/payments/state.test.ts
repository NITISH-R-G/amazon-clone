import { describe, expect, it } from "vitest";
import { applyPaymentEvent, type PaymentEvent, type PaymentStatus } from "@/modules/payments";

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 3, 12, 0, seconds));
const event = (type: PaymentEvent["type"], seconds: number, id = `${type}-${seconds}`): PaymentEvent => ({
  id,
  type,
  providerRef: "pi_1",
  occurredAt: at(seconds),
});
const apply = (status: PaymentStatus, lastEventAt: Date | null, e: PaymentEvent) => applyPaymentEvent({ status, lastEventAt }, e);

describe("payment state transitions (pure)", () => {
  it("T81: a normal attempt moves pending -> processing -> succeeded", () => {
    let state = { status: "pending" as PaymentStatus, lastEventAt: null as Date | null };
    for (const e of [event("payment.processing", 1), event("payment.succeeded", 2)]) {
      const next = applyPaymentEvent(state, e);
      expect(next.applied).toBe(true);
      state = { status: next.status, lastEventAt: next.lastEventAt };
    }
    expect(state.status).toBe("succeeded");
  });

  it("T82: authentication, decline and retry: an open payment can fail and then succeed on a later attempt", () => {
    const afterAction = apply("pending", null, event("payment.requires_action", 1));
    expect(afterAction).toMatchObject({ status: "requires_action", applied: true });
    const failed = apply("requires_action", at(1), event("payment.failed", 2));
    expect(failed).toMatchObject({ status: "failed", applied: true });
    const retried = apply("failed", at(2), event("payment.requires_action", 3));
    expect(retried.status).toBe("requires_action");
    expect(apply("failed", at(2), event("payment.succeeded", 4))).toMatchObject({ status: "succeeded", applied: true });
  });

  it("T83: events that arrive out of order or twice never move a payment backwards", () => {
    // Success wins over a late failure, processing or authentication event.
    for (const late of ["payment.failed", "payment.processing", "payment.requires_action", "payment.canceled"] as const) {
      expect(apply("succeeded", at(5), event(late, 3))).toMatchObject({ status: "succeeded", applied: false });
    }
    // A repeated success changes nothing.
    expect(apply("succeeded", at(5), event("payment.succeeded", 5))).toMatchObject({ status: "succeeded", applied: false });
    // A stale event for an open payment (older than the last applied one) is ignored.
    expect(apply("requires_action", at(10), event("payment.processing", 4))).toMatchObject({ status: "requires_action", applied: false });
    // Success is accepted even if the payment was meanwhile cancelled on our side (money moved: the order logic decides).
    expect(apply("canceled", at(3), event("payment.succeeded", 4))).toMatchObject({ status: "succeeded", applied: true });
    // A cancelled payment ignores other late events.
    expect(apply("canceled", at(3), event("payment.failed", 4))).toMatchObject({ status: "canceled", applied: false });
  });

  it("T84: refunds only follow success", () => {
    expect(apply("succeeded", at(1), event("refund.succeeded", 2))).toMatchObject({ status: "refunded", applied: true });
    expect(apply("succeeded", at(1), { ...event("refund.succeeded", 2), amountCents: 500, refundTotalCents: 500, paymentTotalCents: 1000 })).toMatchObject({
      status: "partially_refunded",
    });
    expect(apply("pending", null, event("refund.succeeded", 2))).toMatchObject({ status: "pending", applied: false });
  });
});
