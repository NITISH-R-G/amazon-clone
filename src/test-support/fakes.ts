import type { Clock, IdGenerator } from "@/lib/ports";
import type { CardInput, PaymentProvider, PaymentResult, ProviderPayment, RefundOutcome } from "@/modules/payments";

/** The three allowed fakes (docs/modules.md): Clock, IdGenerator, PaymentProvider. */

export function fixedClock(iso: string): Clock {
  return { now: () => new Date(iso) };
}

export function fixedIds(opts: { orderNumbers: string[]; tokens?: string[] }): IdGenerator {
  const orders = [...opts.orderNumbers];
  const tokens = [...(opts.tokens ?? [])];
  let seq = 0;
  return {
    orderNumber: () => orders.shift() ?? `ORD-AUTO-${++seq}`,
    token: () => tokens.shift() ?? `token-${++seq}`,
  };
}

export type FakePaymentProvider = PaymentProvider & {
  /** Card submissions that reached the "bank" (the demo flow). */
  calls: { amountCents: number; card: CardInput; providerRef: string }[];
  /** Payments the provider was asked to create, refund and cancel. */
  created: { orderId: string; amountCents: number; idempotencyKey: string }[];
  refunds: { providerRef: string; amountCents: number; idempotencyKey: string }[];
  cancelled: string[];
  /** What `getPayment` reports for a provider reference (default: pending). */
  setPayment(providerRef: string, payment: ProviderPayment): void;
  /** What the next refunds do (default: succeeded). */
  refundOutcome: RefundOutcome["status"];
};

/**
 * A scripted PaymentProvider (one of the three allowed fakes). `result` decides what a card submission does:
 * approved -> a `payment.succeeded` event, declined -> a `payment.failed` event.
 */
export function fakePaymentProvider(result: PaymentResult): FakePaymentProvider {
  const calls: FakePaymentProvider["calls"] = [];
  const created: FakePaymentProvider["created"] = [];
  const refunds: FakePaymentProvider["refunds"] = [];
  const cancelled: string[] = [];
  const known = new Map<string, ProviderPayment>();
  let seq = 0;
  const provider: FakePaymentProvider = {
    kind: "demo",
    calls,
    created,
    refunds,
    cancelled,
    refundOutcome: "succeeded",
    setPayment: (providerRef, payment) => void known.set(providerRef, payment),
    async createPayment(input) {
      created.push(input);
      return { providerRef: `fake_pi_${input.orderId}`, clientSecret: null };
    },
    async getPayment(providerRef) {
      return known.get(providerRef) ?? { status: "pending", lastError: null };
    },
    async cancelPayment(providerRef) {
      cancelled.push(providerRef);
    },
    async refund(input) {
      refunds.push(input);
      return { providerRef: `fake_re_${++seq}`, status: provider.refundOutcome };
    },
    async submitCard({ providerRef, amountCents, card }) {
      calls.push({ providerRef, amountCents, card });
      const base = { id: `fake_evt_${++seq}`, providerRef, occurredAt: new Date(Date.UTC(2026, 9, 3, 12, 0, seq)) };
      return result.status === "approved"
        ? [{ ...base, type: "payment.succeeded" as const, amountCents, brand: result.brand, last4: result.last4 }]
        : [{ ...base, type: "payment.failed" as const, error: result.reason }];
    },
  };
  return provider;
}
