import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { createStripeProvider } from "@/modules/payments";
import { createTestApp } from "@/test-support/app";
import { fakePaymentProvider, fixedIds } from "@/test-support/fakes";
import { processPaymentWebhook } from "./payment-webhook";

const SECRET = "whsec_test_secret";
const g1 = { guestToken: "g1" };
const address = { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" };

/** Real Stripe signature verification and event mapping; only the network calls are scripted. */
async function setup() {
  const stripe = createStripeProvider({ secretKey: "sk_test_unused", webhookSecret: SECRET });
  const fake = fakePaymentProvider({ status: "approved", reference: "x", brand: "visa", last4: "4242" });
  const provider = { ...fake, kind: "stripe" as const, verifyWebhook: stripe.verifyWebhook };
  const app = await createTestApp({ payments: provider, ids: fixedIds({ orderNumbers: ["ORD-1", "ORD-2"] }) });
  await app.cart.addItem(g1, "var-kettle", 1);
  const started = await app.checkout.startCheckout(g1, { address, contactEmail: "a@example.test", idempotencyKey: "k1" });
  if (!started.ok) throw new Error(started.error);
  return { app, fake, ref: started.value.payment.providerRef, orderId: started.value.order.id };
}

let n = 0;
function signed(type: string, object: Record<string, unknown>, created = Math.floor(Date.now() / 1000)) {
  const payload = JSON.stringify({ id: `evt_${++n}`, object: "event", type, created, data: { object } });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return { payload, header };
}
const intent = (ref: string, extra: Record<string, unknown> = {}) => ({ id: ref, object: "payment_intent", amount: 2999, amount_received: 2999, ...extra });

describe("payment webhook (Stripe signatures, idempotent processing)", () => {
  it("T105: a signed payment_intent.succeeded places the order once, even when delivered twice", async () => {
    const { app, fake, ref, orderId } = await setup();
    fake.setPayment(ref, { status: "succeeded", lastError: null, brand: "visa", last4: "4242" });
    const e = signed("payment_intent.succeeded", intent(ref));

    expect((await processPaymentWebhook(app, e.payload, e.header)).status).toBe(200);
    const replay = await processPaymentWebhook(app, e.payload, e.header);
    expect(replay).toEqual({ status: 200, body: { received: true, note: "duplicate" } });

    const view = await app.checkout.getOrderView(g1, orderId);
    expect(view?.order).toMatchObject({ status: "placed", payment: { brand: "visa", last4: "4242" } });
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 4 });
    expect((await app.orders.listOrders(g1)).length).toBe(1);
  });

  it("T106: a bad or missing signature is rejected and changes nothing", async () => {
    const { app, ref, orderId } = await setup();
    const e = signed("payment_intent.succeeded", intent(ref));
    expect((await processPaymentWebhook(app, e.payload, "t=1,v1=bad")).status).toBe(400);
    expect((await processPaymentWebhook(app, e.payload, null)).status).toBe(400);
    expect((await processPaymentWebhook(app, e.payload.replace("2999", "1"), e.header)).status).toBe(400); // tampered body
    expect((await app.checkout.getOrderView(g1, orderId))?.order.status).toBe("awaiting_payment");
  });

  it("T107: a failed payment keeps the order awaiting payment with the reason; an older failure after success is ignored", async () => {
    const { app, ref, orderId } = await setup();
    const now = Math.floor(Date.now() / 1000);
    const failed = signed("payment_intent.payment_failed", intent(ref, { last_payment_error: { decline_code: "insufficient_funds", code: "card_declined" } }), now);
    await processPaymentWebhook(app, failed.payload, failed.header);
    expect((await app.checkout.getOrderView(g1, orderId))?.payment).toMatchObject({ status: "failed", lastError: "insufficient_funds" });
    expect((await app.checkout.getOrderView(g1, orderId))?.order.status).toBe("awaiting_payment");

    const ok = signed("payment_intent.succeeded", intent(ref), now + 5);
    await processPaymentWebhook(app, ok.payload, ok.header);
    const late = signed("payment_intent.payment_failed", intent(ref, { last_payment_error: { code: "card_declined" } }), now + 2); // out of order
    await processPaymentWebhook(app, late.payload, late.header);
    expect((await app.checkout.getOrderView(g1, orderId))?.order.status).toBe("placed");
  });

  it("T108: events for unknown payments and unrelated event types are acknowledged, not retried", async () => {
    const { app } = await setup();
    const unknown = signed("payment_intent.succeeded", intent("pi_unknown"));
    expect((await processPaymentWebhook(app, unknown.payload, unknown.header)).status).toBe(200);
    const other = signed("customer.created", { id: "cus_1", object: "customer" });
    expect(await processPaymentWebhook(app, other.payload, other.header)).toEqual({ status: 200, body: { received: true, note: "ignored" } });
  });

  it("T109: a refund webhook after a cancelled paid order records the refund once", async () => {
    const { app, fake, ref, orderId } = await setup();
    const paid = signed("payment_intent.succeeded", intent(ref));
    fake.setPayment(ref, { status: "succeeded", lastError: null, brand: "visa", last4: "4242" });
    await processPaymentWebhook(app, paid.payload, paid.header);
    expect((await app.checkout.cancelOrder(g1, orderId)).ok).toBe(true);
    const refunded = signed("charge.refunded", { id: "ch_1", object: "charge", payment_intent: ref, amount: 3738, amount_refunded: 3738 });
    await processPaymentWebhook(app, refunded.payload, refunded.header);
    const view = await app.checkout.getOrderView(g1, orderId);
    expect(view?.order).toMatchObject({ status: "cancelled", refundStatus: "refunded" });
    expect(view?.payment).toMatchObject({ status: "refunded", refundedCents: 3738 });
    expect(fake.refunds).toHaveLength(1);
  });
});
