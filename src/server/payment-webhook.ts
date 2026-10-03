import type { App } from "./app";

export type WebhookResult = { status: number; body: { received: boolean; note?: string } };

/**
 * Handles a provider webhook: verify the signature over the raw body, then hand the event to checkout, which is
 * idempotent (duplicates and out-of-order deliveries are safe). Unknown or irrelevant events are acknowledged so
 * the provider stops retrying them; a bad signature is rejected; our own failures return 500 so it retries.
 */
export async function processPaymentWebhook(app: App, rawBody: string, signature: string | null): Promise<WebhookResult> {
  const provider = app.payments.provider;
  if (!provider.verifyWebhook) return { status: 404, body: { received: false, note: "webhooks not supported" } };
  if (!signature) return { status: 400, body: { received: false, note: "missing signature" } };

  let event;
  try {
    event = provider.verifyWebhook(rawBody, signature);
  } catch {
    return { status: 400, body: { received: false, note: "invalid signature" } };
  }
  if (!event) return { status: 200, body: { received: true, note: "ignored" } };

  try {
    // Card details are not on the event itself: ask the provider (server to server) before the order is placed.
    if (event.type === "payment.succeeded" && !event.last4) {
      const remote = await provider.getPayment(event.providerRef).catch(() => null);
      if (remote?.last4) event = { ...event, brand: remote.brand, last4: remote.last4 };
    }
    const handled = await app.checkout.handlePaymentEvent(event);
    if (!handled.ok) return { status: 200, body: { received: true, note: "unknown payment" } };
    return { status: 200, body: { received: true, note: handled.value.duplicate ? "duplicate" : undefined } };
  } catch {
    return { status: 500, body: { received: false } };
  }
}
