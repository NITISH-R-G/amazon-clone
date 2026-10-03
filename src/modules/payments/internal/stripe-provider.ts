import Stripe from "stripe";
import type { PaymentEvent, PaymentProvider, PaymentStatus, ProviderPayment, RefundOutcome } from "../types";

export type StripeConfig = { secretKey: string; webhookSecret: string | null };

/** The PaymentIntent fields we read (Stripe is the source of truth for card details). */
type Intent = Stripe.PaymentIntent;

function cardOf(intent: Intent): { brand?: string; last4?: string } {
  const charge = intent.latest_charge;
  if (charge && typeof charge === "object") {
    const card = charge.payment_method_details?.card;
    if (card) return { brand: card.brand ?? undefined, last4: card.last4 ?? undefined };
  }
  return {};
}

export function intentStatus(intent: Intent): PaymentStatus {
  switch (intent.status) {
    case "succeeded":
      return "succeeded";
    case "processing":
      return "processing";
    case "requires_action":
      return "requires_action";
    case "canceled":
      return "canceled";
    default:
      // requires_payment_method: fresh, or the last attempt failed.
      return intent.last_payment_error ? "failed" : "pending";
  }
}

/** A customer-safe message for a Stripe decline code. */
export function declineMessage(code: string | null | undefined): string {
  switch (code) {
    case "insufficient_funds":
      return "Your card has insufficient funds. Try another card.";
    case "card_declined":
    case "generic_decline":
      return "Your card was declined. Try another card.";
    case "expired_card":
      return "Your card has expired. Try another card.";
    case "incorrect_cvc":
      return "The security code is incorrect.";
    case "authentication_required":
    case "payment_intent_authentication_failure":
      return "Card authentication failed. Try again or use another card.";
    default:
      return "Your payment could not be completed. Try another card.";
  }
}

/**
 * Stripe (test mode) behind the PaymentProvider port. Amounts are always the server's; the browser only receives the
 * PaymentIntent client secret. Payment success is only ever learned from a signed webhook or a server-side retrieve.
 */
export function createStripeProvider(config: StripeConfig): PaymentProvider & { stripe: Stripe } {
  const stripe = new Stripe(config.secretKey, { maxNetworkRetries: 2 });

  async function retrieve(providerRef: string): Promise<Intent> {
    return stripe.paymentIntents.retrieve(providerRef, { expand: ["latest_charge"] });
  }

  return {
    kind: "stripe",
    stripe,
    async createPayment({ orderId, amountCents, idempotencyKey }) {
      const intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
          metadata: { order_id: orderId },
          description: `Cartly order ${orderId}`,
        },
        { idempotencyKey: `pi:${idempotencyKey}` },
      );
      // A retried start returns the same intent; if it was already used up, the caller sees its real status via sync.
      return { providerRef: intent.id, clientSecret: intent.client_secret };
    },
    async getPayment(providerRef): Promise<ProviderPayment | null> {
      const intent = await retrieve(providerRef);
      return {
        status: intentStatus(intent),
        lastError: intent.last_payment_error ? (intent.last_payment_error.decline_code ?? intent.last_payment_error.code ?? "payment_failed") : null,
        ...cardOf(intent),
      };
    },
    async cancelPayment(providerRef) {
      await stripe.paymentIntents.cancel(providerRef);
    },
    async refund({ providerRef, amountCents, idempotencyKey }): Promise<RefundOutcome> {
      const refund = await stripe.refunds.create(
        { payment_intent: providerRef, amount: amountCents, metadata: { refund_key: idempotencyKey } },
        { idempotencyKey: `re:${idempotencyKey}` },
      );
      const status = refund.status === "succeeded" ? "succeeded" : refund.status === "failed" || refund.status === "canceled" ? "failed" : "pending";
      return { providerRef: refund.id, status };
    },
    verifyWebhook(rawBody, signature) {
      if (!config.webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
      // Throws on a bad signature or a stale timestamp.
      const event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
      return mapStripeEvent(event);
    },
  };
}

/** Our vocabulary for the Stripe events we care about; everything else is ignored (null). */
export function mapStripeEvent(event: Stripe.Event): PaymentEvent | null {
  const base = { id: event.id, occurredAt: new Date(event.created * 1000) };
  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      return { ...base, type: "payment.succeeded", providerRef: pi.id, amountCents: pi.amount_received || pi.amount, ...cardOf(pi) };
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const e = pi.last_payment_error;
      return { ...base, type: "payment.failed", providerRef: pi.id, error: e?.decline_code ?? e?.code ?? "payment_failed" };
    }
    case "payment_intent.processing":
      return { ...base, type: "payment.processing", providerRef: event.data.object.id };
    case "payment_intent.requires_action":
      return { ...base, type: "payment.requires_action", providerRef: event.data.object.id };
    case "payment_intent.canceled":
      return { ...base, type: "payment.canceled", providerRef: event.data.object.id };
    case "charge.refunded": {
      const charge = event.data.object;
      const ref = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!ref) return null;
      return { ...base, type: "refund.succeeded", providerRef: ref, refundTotalCents: charge.amount_refunded, paymentTotalCents: charge.amount };
    }
    default:
      return null;
  }
}
