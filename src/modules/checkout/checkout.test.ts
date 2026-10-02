import { describe, expect, it } from "vitest";
import { createTestApp } from "@/test-support/app";
import { fakePaymentProvider, fixedClock, fixedIds } from "@/test-support/fakes";
import type { Cart } from "@/modules/cart";
import { quoteCart } from "@/modules/checkout";

const cartWithSubtotal = (subtotalCents: number): Cart => ({ lines: [], itemCount: 1, subtotalCents });

describe("checkout pricing", () => {
  it("T6: applies the shipping threshold, tax rounding and total", () => {
    // 2999: under the 3500 threshold -> shipping 499; tax 8% = 239.92 -> 240
    expect(quoteCart(cartWithSubtotal(2999))).toEqual({
      subtotalCents: 2999,
      shippingCents: 499,
      taxCents: 240,
      totalCents: 3738,
    });
    // 5998: over the threshold -> free shipping; tax 8% = 479.84 -> 480
    expect(quoteCart(cartWithSubtotal(5998))).toEqual({
      subtotalCents: 5998,
      shippingCents: 0,
      taxCents: 480,
      totalCents: 6478,
    });
  });
});

describe("checkout quote", () => {
  it("T7: quotes from the server-side cart, and refuses an empty cart", async () => {
    const app = await createTestApp();
    await app.cart.addItem({ guestToken: "g1" }, "var-kettle", 2);

    const quote = await app.checkout.getQuote({ guestToken: "g1" });
    expect(quote).toEqual({
      ok: true,
      value: { subtotalCents: 5998, shippingCents: 0, taxCents: 480, totalCents: 6478 },
    });

    expect(await app.checkout.getQuote({ guestToken: "g2" })).toEqual({ ok: false, error: "EMPTY_CART" });
  });
});

const g1 = { guestToken: "g1" };
const input = {
  address: { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" },
  contactEmail: "a@example.test",
  payment: { number: "4242424242424242", expiry: "12/30", cvc: "123" },
  idempotencyKey: "k1",
};
const approved = { status: "approved", reference: "pay-1", brand: "visa", last4: "4242" } as const;

describe("checkout placeOrder", () => {
  it("T8: creates the order, takes payment, empties the cart and decrements stock", async () => {
    const payments = fakePaymentProvider(approved);
    const app = await createTestApp({
      clock: fixedClock("2026-10-03T12:00:00Z"),
      ids: fixedIds({ orderNumbers: ["ORD-0001"] }),
      payments,
    });
    await app.cart.addItem(g1, "var-kettle", 2);

    const result = await app.checkout.placeOrder(g1, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const order = result.value;
    expect(order.number).toBe("ORD-0001");
    expect(order.totalCents).toBe(6478);
    expect(order.items).toEqual([
      expect.objectContaining({ title: "Test Kettle", unitPriceCents: 2999, quantity: 2 }),
    ]);
    expect(order.placedAt.toISOString()).toBe("2026-10-03T12:00:00.000Z");
    expect((await app.cart.getCart(g1)).lines).toEqual([]);
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 3 });
    expect(payments.calls).toHaveLength(1);
    expect(payments.calls[0].amountCents).toBe(6478);
  });
});

describe("checkout failure paths", () => {
  it("T9: a declined payment changes nothing", async () => {
    const payments = fakePaymentProvider({ status: "declined", reason: "card_declined" });
    const app = await createTestApp({ ids: fixedIds({ orderNumbers: ["ORD-0001"] }), payments });
    await app.cart.addItem(g1, "var-kettle", 2);

    const result = await app.checkout.placeOrder(g1, input);

    expect(result).toEqual({ ok: false, error: "PAYMENT_DECLINED" });
    expect((await app.cart.getCart(g1)).lines[0].quantity).toBe(2);
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 5 });
    expect(await app.orders.listOrders(g1)).toEqual([]);
  });

  it("T10: re-validates stock at placement", async () => {
    const payments = fakePaymentProvider(approved);
    const app = await createTestApp({ ids: fixedIds({ orderNumbers: ["ORD-0001", "ORD-0002"] }), payments });
    const g2 = { guestToken: "g2" };
    await app.cart.addItem(g1, "var-mug", 1); // mug stock is 1
    await app.cart.addItem(g2, "var-mug", 1);

    expect((await app.checkout.placeOrder(g1, input)).ok).toBe(true);
    const second = await app.checkout.placeOrder(g2, { ...input, idempotencyKey: "k2" });

    expect(second).toEqual({ ok: false, error: "OUT_OF_STOCK" });
    expect(await app.orders.listOrders(g2)).toEqual([]);
    expect(payments.calls).toHaveLength(1); // g2 was never charged
  });

  it("T11: placing twice with the same idempotency key creates one order", async () => {
    const payments = fakePaymentProvider(approved);
    const app = await createTestApp({ ids: fixedIds({ orderNumbers: ["ORD-0001", "ORD-0002"] }), payments });
    await app.cart.addItem(g1, "var-kettle", 2);

    const first = await app.checkout.placeOrder(g1, input);
    const second = await app.checkout.placeOrder(g1, input);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.number).toBe(first.value.number);
    expect(await app.orders.listOrders(g1)).toHaveLength(1);
    expect(await app.catalog.getAvailability("var-kettle")).toEqual({ inStock: true, quantity: 3 });
    expect(payments.calls).toHaveLength(1);
  });

  it("T20: refuses to place an order for an empty cart without charging", async () => {
    const payments = fakePaymentProvider(approved);
    const app = await createTestApp({ payments });

    expect(await app.checkout.placeOrder(g1, input)).toEqual({ ok: false, error: "EMPTY_CART" });
    expect(payments.calls).toHaveLength(0);
    expect(await app.orders.listOrders(g1)).toEqual([]);
  });

  it("T21: refuses an incomplete shipping address without charging or changing the cart", async () => {
    const payments = fakePaymentProvider(approved);
    const app = await createTestApp({ payments });
    await app.cart.addItem(g1, "var-kettle", 2);

    const result = await app.checkout.placeOrder(g1, { ...input, address: { ...input.address, postalCode: "" } });

    expect(result).toEqual({ ok: false, error: "INVALID_ADDRESS" });
    expect(payments.calls).toHaveLength(0);
    expect((await app.cart.getCart(g1)).lines[0].quantity).toBe(2);
  });
});

