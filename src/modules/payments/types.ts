import type { Cents } from "@/lib/money";

export type CardInput = { number: string; expiry: string; cvc: string };

/** What the demo provider's card evaluation takes (kept: it is the demo "bank"). */
export type PaymentRequest = {
  amountCents: Cents;
  card: CardInput;
  idempotencyKey: string;
};

export type PaymentResult =
  | { status: "approved"; reference: string; brand: string; last4: string }
  | { status: "declined"; reason: string };

/** The payment's own lifecycle. Never mixed with the order's (decision D27). */
export type PaymentStatus =
  | "pending"
  | "requires_action"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "partially_refunded"
  | "refunded";

/**
 * What a provider tells us happened, in our own vocabulary. The Stripe provider maps `payment_intent.*` and
 * `charge.refunded` events onto these; the demo provider emits them directly. `id` is the provider's event id
 * (used to ignore duplicate deliveries); `occurredAt` orders events for the same payment.
 */
export type PaymentEvent = {
  id: string;
  type:
    | "payment.requires_action"
    | "payment.processing"
    | "payment.succeeded"
    | "payment.failed"
    | "payment.canceled"
    | "refund.succeeded"
    | "refund.failed";
  providerRef: string;
  occurredAt: Date;
  amountCents?: Cents;
  /** Card summary, known once a payment succeeds. */
  brand?: string;
  last4?: string;
  error?: string;
  /** Refund events: this refund, the total refunded so far, and the payment's total. */
  refundTotalCents?: Cents;
  paymentTotalCents?: Cents;
};

export type ProviderPayment = {
  status: PaymentStatus;
  lastError: string | null;
  brand?: string;
  last4?: string;
};

export type RefundOutcome = { providerRef: string; status: "pending" | "succeeded" | "failed" };

/**
 * The port checkout depends on. The demo provider and the Stripe provider implement it.
 * Nothing here returns "the customer paid": payment success only ever arrives as a verified `PaymentEvent`
 * or a server-side `getPayment`.
 */
export interface PaymentProvider {
  readonly kind: "demo" | "stripe";
  /** Creates the payment at the provider. `idempotencyKey` makes a retry return the same payment. */
  createPayment(input: { orderId: string; amountCents: Cents; idempotencyKey: string }): Promise<{
    providerRef: string;
    clientSecret: string | null;
  }>;
  /** Server-side retrieval (the fallback when no webhook arrived). Null when the provider cannot say. */
  getPayment(providerRef: string): Promise<ProviderPayment | null>;
  /** Stops an unpaid payment (expired or cancelled order). Best effort. */
  cancelPayment(providerRef: string): Promise<void>;
  refund(input: { providerRef: string; amountCents: Cents; idempotencyKey: string }): Promise<RefundOutcome>;
  /** Stripe-style: verifies a signed webhook body and returns the event; throws on a bad signature. */
  verifyWebhook?(rawBody: string, signature: string): PaymentEvent | null;
  /** Demo only: the customer's card going to the "bank". Real providers collect card data in the browser. */
  submitCard?(input: { providerRef: string; amountCents: Cents; card: CardInput }): Promise<PaymentEvent[]>;
}
