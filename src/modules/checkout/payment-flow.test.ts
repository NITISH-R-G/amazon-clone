import { describe, expect, it } from "vitest";
import type { Clock } from "@/lib/ports";
import type { PaymentEvent } from "@/modules/payments";
import { createTestApp } from "@/test-support/app";
import { fakePaymentProvider, fixedIds } from "@/test-support/fakes";

const T0 = new Date("2026-10-03T12:00:00Z").getTime();
const MIN = 60_000;
const g1 = { guestToken: "g1" };
const g2 = { guestToken: "g2" };
const address = { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" };
const start = { address, contactEmail: "a@example.test" };
const card = { number: "4242424242424242", expiry: "12/30", cvc: "123" };
const approved = { status: "approved", reference: "pay-1", brand: "visa", last4: "4242" } as const;

async function setup(result: Parameters<typeof fakePaymentProvider>[0] = approved) {
  let now = T0;
  const clock: Clock = { now: () => new Date(now) };
  const provider = fakePaymentProvider(result);
  const app = await createTestApp({ clock, payments: provider, ids: fixedIds({ orderNumbers: ["ORD-1", "ORD-2", "ORD-3", "ORD-4"] }) });
  let n = 0;
  const event = (type: PaymentEvent["type"], providerRef: string, extra: Partial<PaymentEvent> = {}): PaymentEvent => ({
    id: `evt_${++n}`,
    type,
    providerRef,
    occurredAt: new Date(now),
    ...extra,
  });
  return { app, provider, event, advance: (minutes: number) => (now += minutes * MIN) };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

const started = async (app: Ctx["app"], actor = g1, key = "k1") => {
  const r = await app.checkout.startCheckout(actor, { ...start, idempotencyKey: key });
  if (!r.ok) throw new Error(`start failed: ${r.error}`);
  return r.value;
};

const paid = (c: Ctx, providerRef: string) => c.event("payment.succeeded", providerRef, { brand: "visa", last4: "4242" });

describe("two-phase checkout: reservation, payment pending, confirmation", () => {
  it("T92: starting checkout creates an order awaiting payment, holds the stock and a pending payment, and keeps the cart", async () => {
    const { app, provider } = await setup();
    await app.cart.addItem(g1, "var-kettle", 2);

    const { order, payment } = await started(app);

    expect(order).toMatchObject({ status: "awaiting_payment", paidAt: null, totalCents: 6478, cancellable: true });
    expect(order.payment).toBeNull();
    expect(payment).toMatchObject({ status: "pending", providerRef: `fake_pi_${order.id}` });
    expect(provider.created).toEqual([{ orderId: order.id, amountCents: 6478, idempotencyKey: order.id }]);
    expect((await app.cart.getCart(g1)).lines[0].quantity).toBe(2); // the cart stays until payment succeeds
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 5 }); // nothing sold yet
    expect(await app.orders.listOrders(g1)).toEqual([]); // an unpaid order is not in the history
  });

  it("T93: starting twice with the same key reuses the order; a changed or empty cart is refused", async () => {
    const { app } = await setup();
    await app.cart.addItem(g1, "var-kettle", 2);
    const first = await started(app);
    const second = await started(app);
    expect(second.order.id).toBe(first.order.id);

    await app.cart.addItem(g1, "var-kettle", 1);
    expect(await app.checkout.startCheckout(g1, { ...start, idempotencyKey: "k1" })).toEqual({ ok: false, error: "CART_CHANGED" });
    expect(await app.checkout.startCheckout(g2, { ...start, idempotencyKey: "k2" })).toEqual({ ok: false, error: "EMPTY_CART" });
    expect(await app.checkout.startCheckout(g1, { ...start, address: { ...address, postalCode: "" }, idempotencyKey: "k3" })).toEqual({
      ok: false,
      error: "INVALID_ADDRESS",
    });
  });

  it("T94: a verified success event places the order: stock sold, cart cleared, payment and order are separate facts", async () => {
    const c = await setup();
    const { app, advance } = c;
    await app.cart.addItem(g1, "var-kettle", 2);
    const { order, payment } = await started(app);

    advance(3);
    const handled = await app.checkout.handlePaymentEvent(paid(c, payment.providerRef));
    expect(handled).toMatchObject({ ok: true, value: { orderId: order.id, paymentStatus: "succeeded", orderPaid: true, duplicate: false } });

    const view = await app.checkout.getOrderView(g1, order.id);
    expect(view?.order).toMatchObject({ status: "placed", payment: { brand: "visa", last4: "4242" } });
    expect(view?.order.paidAt).toEqual(new Date(T0 + 3 * MIN));
    expect(view?.order.estimatedDelivery).toEqual(new Date(T0 + 3 * MIN + 120 * MIN)); // the clock starts when paid
    expect(view?.payment).toMatchObject({ status: "succeeded", brand: "visa", last4: "4242", refundedCents: 0 });
    expect((await app.cart.getCart(g1)).lines).toEqual([]);
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 3 });
    expect((await app.orders.listOrders(g1)).map((o) => o.number)).toEqual(["ORD-1"]);
  });

  it("T95: replaying a webhook, or delivering success twice under different ids, sells the stock once", async () => {
    const c = await setup();
    const { app } = c;
    await app.cart.addItem(g1, "var-kettle", 2);
    const { payment } = await started(app);
    const success = paid(c, payment.providerRef);

    const first = await app.checkout.handlePaymentEvent(success);
    const replay = await app.checkout.handlePaymentEvent(success); // same event id
    const again = await app.checkout.handlePaymentEvent(paid(c, payment.providerRef)); // a different event

    expect(first).toMatchObject({ ok: true, value: { duplicate: false, orderPaid: true } });
    expect(replay).toMatchObject({ ok: true, value: { duplicate: true } });
    expect(again).toMatchObject({ ok: true, value: { duplicate: false, orderPaid: true } });
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 3 });
    expect(await app.orders.listOrders(g1)).toHaveLength(1);
  });

  it("T96: an event for an unknown payment is rejected; a late failure never undoes a success", async () => {
    const c = await setup();
    const { app, advance } = c;
    expect(await app.checkout.handlePaymentEvent(c.event("payment.succeeded", "pi_nope"))).toEqual({ ok: false, error: "UNKNOWN_PAYMENT" });

    await app.cart.addItem(g1, "var-kettle", 1);
    const { order, payment } = await started(app);
    await app.checkout.handlePaymentEvent(paid(c, payment.providerRef));
    advance(-2); // a failure that happened earlier arrives afterwards
    const late = await app.checkout.handlePaymentEvent(c.event("payment.failed", payment.providerRef, { error: "card_declined" }));
    expect(late).toMatchObject({ ok: true, value: { paymentStatus: "succeeded", orderPaid: true } });
    expect((await app.checkout.getOrderView(g1, order.id))?.order.status).toBe("placed");
  });

  it("T97: a declined payment keeps the order and the hold; a retry on the same payment succeeds", async () => {
    const c = await setup();
    const { app, provider } = c;
    await app.cart.addItem(g1, "var-mug", 1); // the last unit
    await app.cart.addItem(g2, "var-mug", 1);
    const { order, payment } = await started(app);

    await app.checkout.handlePaymentEvent(c.event("payment.failed", payment.providerRef, { error: "card_declined" }));
    const view = await app.checkout.getOrderView(g1, order.id);
    expect(view?.payment).toMatchObject({ status: "failed", lastError: "card_declined" });
    expect(view?.order.status).toBe("awaiting_payment");
    expect(await app.checkout.startCheckout(g2, { ...start, idempotencyKey: "k2" })).toEqual({ ok: false, error: "OUT_OF_STOCK" }); // still held

    const retry = await app.checkout.attemptDemoPayment(g1, order.id, card);
    expect(retry).toMatchObject({ ok: true, value: { paymentStatus: "succeeded", orderPaid: true } });
    expect(provider.calls).toHaveLength(1);
    expect((await app.checkout.getOrderView(g1, order.id))?.order.status).toBe("placed");
  });

  it("T98: a declined card through the demo bank leaves the order awaiting payment with the reason", async () => {
    const { app } = await setup({ status: "declined", reason: "card_declined" });
    await app.cart.addItem(g1, "var-kettle", 1);
    const { order } = await started(app);
    expect(await app.checkout.attemptDemoPayment(g1, order.id, card)).toEqual({ ok: false, error: "PAYMENT_DECLINED" });
    const view = await app.checkout.getOrderView(g1, order.id);
    expect(view?.payment).toMatchObject({ status: "failed", lastError: "card_declined" });
    expect(view?.order.status).toBe("awaiting_payment");
  });
});

describe("expiry, cancellation and refunds", () => {
  it("T99: an unpaid order expires with its hold, freeing the last unit for someone else", async () => {
    const { app, advance } = await setup();
    await app.cart.addItem(g1, "var-mug", 1);
    await app.cart.addItem(g2, "var-mug", 1);
    const { order } = await started(app);
    expect(await app.checkout.startCheckout(g2, { ...start, idempotencyKey: "k2" })).toEqual({ ok: false, error: "OUT_OF_STOCK" });

    advance(16);
    expect((await app.checkout.getOrderView(g1, order.id))?.order.status).toBe("expired");
    expect((await app.checkout.startCheckout(g2, { ...start, idempotencyKey: "k2" })).ok).toBe(true);
  });

  it("T100: a payment that succeeds after the order expired is honoured if the unit is free, and refunded if someone else took it", async () => {
    // Free: the order is placed after all.
    const free = await setup();
    await free.app.cart.addItem(g1, "var-mug", 1);
    const a = await started(free.app);
    free.advance(30);
    await free.app.checkout.handlePaymentEvent(paid(free, a.payment.providerRef));
    expect((await free.app.checkout.getOrderView(g1, a.order.id))?.order.status).toBe("placed");

    // Taken: B bought the unit; A's late payment is refunded and A's order is cancelled, never double-sold.
    const taken = await setup();
    await taken.app.cart.addItem(g1, "var-mug", 1);
    await taken.app.cart.addItem(g2, "var-mug", 1);
    const first = await started(taken.app);
    taken.advance(16);
    const second = await started(taken.app, g2, "k2");
    await taken.app.checkout.handlePaymentEvent(paid(taken, second.payment.providerRef));
    await taken.app.checkout.handlePaymentEvent(paid(taken, first.payment.providerRef));

    const lost = await taken.app.checkout.getOrderView(g1, first.order.id);
    expect(lost?.order).toMatchObject({ status: "cancelled", refundStatus: "refunded" });
    expect(lost?.payment).toMatchObject({ status: "refunded", refundedCents: first.order.totalCents });
    expect(taken.provider.refunds).toHaveLength(1);
    expect(await taken.app.catalog.getAvailability("var-mug")).toEqual({ inStock: false, quantity: 0 });
  });

  it("T101: cancelling an unpaid order releases the hold and cancels the payment", async () => {
    const { app, provider } = await setup();
    await app.cart.addItem(g1, "var-mug", 1);
    await app.cart.addItem(g2, "var-mug", 1);
    const { order, payment } = await started(app);

    expect((await app.checkout.cancelOrder(g1, order.id)).ok).toBe(true);
    expect(provider.cancelled).toEqual([payment.providerRef]);
    expect((await app.checkout.getOrderView(g1, order.id))?.payment?.status).toBe("canceled");
    expect((await app.checkout.startCheckout(g2, { ...start, idempotencyKey: "k2" })).ok).toBe(true);
  });

  it("T102: cancelling a paid order before it ships refunds it through the provider, then restocks; a failed refund is not pretended", async () => {
    const c = await setup();
    const { app, provider } = c;
    await app.cart.addItem(g1, "var-kettle", 2);
    const { order, payment } = await started(app);
    await app.checkout.handlePaymentEvent(paid(c, payment.providerRef));

    provider.refundOutcome = "failed";
    expect((await app.checkout.cancelOrder(g1, order.id)).ok).toBe(true);
    const failed = await app.checkout.getOrderView(g1, order.id);
    expect(failed?.order).toMatchObject({ status: "cancelled", refundStatus: "failed" });
    expect(failed?.payment).toMatchObject({ status: "succeeded", refundedCents: 0 }); // the money has NOT been returned
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 5 }); // stock is back regardless

    provider.refundOutcome = "succeeded";
    expect((await app.checkout.retryRefund(g1, order.id)).ok).toBe(true);
    const done = await app.checkout.getOrderView(g1, order.id);
    expect(done?.order.refundStatus).toBe("refunded");
    expect(done?.payment).toMatchObject({ status: "refunded", refundedCents: 6478 });
    expect(provider.refunds).toHaveLength(2);
    expect(new Set(provider.refunds.map((r) => r.idempotencyKey)).size).toBe(2); // each attempt is its own refund
  });

  it("T103: with no webhook, the server asks the provider and completes the order from its answer (and only its answer)", async () => {
    const { app, provider } = await setup();
    await app.cart.addItem(g1, "var-kettle", 1);
    const { order, payment } = await started(app);

    expect((await app.checkout.syncPayment(g1, order.id))?.order.status).toBe("awaiting_payment"); // provider says pending
    provider.setPayment(payment.providerRef, { status: "succeeded", lastError: null, brand: "visa", last4: "4242" });
    const synced = await app.checkout.syncPayment(g1, order.id);
    expect(synced?.order.status).toBe("placed");
    expect(synced?.payment?.status).toBe("succeeded");
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 4 });
    await app.checkout.syncPayment(g1, order.id); // syncing again changes nothing
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 4 });
  });

  it("T104: two customers, one last unit: the first to start checkout keeps it through payment; the second cannot buy it", async () => {
    const c = await setup();
    const { app } = c;
    await app.cart.addItem(g1, "var-mug", 1);
    await app.cart.addItem(g2, "var-mug", 1);
    const [a, b] = await Promise.all([
      app.checkout.startCheckout(g1, { ...start, idempotencyKey: "ka" }),
      app.checkout.startCheckout(g2, { ...start, idempotencyKey: "kb" }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const winner = a.ok ? a.value : b.ok ? b.value : null;
    if (!winner) throw new Error("no winner");

    await app.checkout.handlePaymentEvent(paid(c, winner.payment.providerRef));
    expect(await app.catalog.getAvailability("var-mug")).toEqual({ inStock: false, quantity: 0 });
    expect(await app.checkout.startCheckout(a.ok ? g2 : g1, { ...start, idempotencyKey: "kz" })).toEqual({ ok: false, error: "OUT_OF_STOCK" });
  });
});
