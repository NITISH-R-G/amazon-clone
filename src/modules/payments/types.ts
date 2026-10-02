import type { Cents } from "@/lib/money";

export type CardInput = { number: string; expiry: string; cvc: string };

export type PaymentRequest = {
  amountCents: Cents;
  card: CardInput;
  idempotencyKey: string;
};

export type PaymentResult =
  | { status: "approved"; reference: string; brand: string; last4: string }
  | { status: "declined"; reason: string };

/** The port checkout depends on. Concrete providers (demo now, Stripe later) implement it. */
export interface PaymentProvider {
  authorize(request: PaymentRequest): Promise<PaymentResult>;
}
