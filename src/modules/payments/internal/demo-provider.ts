import type { Clock, IdGenerator } from "@/lib/ports";
import type { PaymentProvider, PaymentRequest, PaymentResult } from "../types";
import { cardBrand, cardDigits, validateCardFormat } from "./card";

/** Published demo number that is always declined. */
const DECLINE_NUMBER = "4000000000000002";

/**
 * Demo provider: no money moves and no card data is stored. It plays both sides of a real provider: it creates a
 * payment, and `submitCard` is the customer's card going to the "bank", answering with the same kind of events a real
 * provider would send (success, failure). Approves any well-formed card except the designated decline number.
 */
export function createDemoProvider({ clock, ids }: { clock: Clock; ids: IdGenerator }): PaymentProvider & {
  authorize(request: PaymentRequest): Promise<PaymentResult>;
} {
  async function authorize({ amountCents, card }: PaymentRequest): Promise<PaymentResult> {
    if (amountCents <= 0) return { status: "declined", reason: "invalid_amount" };
    const digits = cardDigits(card.number);
    if (digits === DECLINE_NUMBER) return { status: "declined", reason: "card_declined" };
    const format = validateCardFormat(card, clock.now());
    if (!format.ok) return { status: "declined", reason: "invalid_card" };
    return { status: "approved", reference: ids.token(), brand: cardBrand(digits), last4: digits.slice(-4) };
  }

  return {
    kind: "demo",
    authorize,
    async createPayment({ orderId }) {
      return { providerRef: `demo_pi_${orderId}`, clientSecret: null };
    },
    // The demo bank keeps no state: the answer to a card submission is the event itself.
    async getPayment() {
      return null;
    },
    async cancelPayment() {},
    async refund() {
      return { providerRef: `demo_re_${ids.token()}`, status: "succeeded" };
    },
    async submitCard({ providerRef, amountCents, card }) {
      const result = await authorize({ amountCents, card, idempotencyKey: providerRef });
      const base = { id: `demo_evt_${ids.token()}`, providerRef, occurredAt: clock.now() };
      return result.status === "approved"
        ? [{ ...base, type: "payment.succeeded" as const, amountCents, brand: result.brand, last4: result.last4 }]
        : [{ ...base, type: "payment.failed" as const, error: result.reason }];
    },
  };
}
