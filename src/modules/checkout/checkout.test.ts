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
      discountCents: 0,
      shippingCents: 499,
      taxCents: 240,
      totalCents: 3738,
    });
    // 5998: over the threshold -> free shipping; tax 8% = 479.84 -> 480
    expect(quoteCart(cartWithSubtotal(5998))).toEqual({
      subtotalCents: 5998,
      discountCents: 0,
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
      value: { quote: { subtotalCents: 5998, discountCents: 0, shippingCents: 0, taxCents: 480, totalCents: 6478 }, coupon: null, couponError: null },
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

  it("T68: the chosen variant (SKU and options) is kept from the cart into the order", async () => {
    const app = await createTestApp({ ids: fixedIds({ orderNumbers: ["ORD-VAR-1"] }) });
    await app.cart.addItem(g1, "var-mug", 1);

    const cart = await app.cart.getCart(g1);
    expect(cart.lines[0]).toMatchObject({ variantId: "var-mug", sku: "SKU-MUG-SPK-350", variantLabel: "Speckled, 350 ml" });

    const placed = await app.checkout.placeOrder(g1, {
      address: { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" },
      contactEmail: "a@example.test",
      payment: { number: "4242424242424242", expiry: "12/30", cvc: "123" },
      idempotencyKey: "k-var",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.value.items[0]).toMatchObject({ variantId: "var-mug", sku: "SKU-MUG-SPK-350", variantLabel: "Speckled, 350 ml" });
    // The snapshot is read back unchanged.
    const read = await app.orders.getOrder(g1, placed.value.id);
    expect(read?.items[0]).toMatchObject({ sku: "SKU-MUG-SPK-350", variantLabel: "Speckled, 350 ml" });
  });
});

describe("checkout with offers", () => {
  const address = { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" };
  const payment = { number: "4242424242424242", expiry: "12/30", cvc: "123" };

  it("T78: a seller line takes stock from the offer, adds its own shipping, keeps its seller on the order and delays delivery", async () => {
    let now = new Date("2026-10-03T12:00:00Z").getTime();
    const app = await createTestApp({ clock: { now: () => new Date(now) } });
    await app.cart.addItem(g1, "var-kettle", 2, "offer-kettle-nw"); // 2 x 2,699 + 399 shipping, handling 180 min

    const quote = await app.checkout.getQuote(g1);
    // Only seller lines: no first-party shipping, the seller's own 399. Tax is 8% of the items.
    expect(quote).toMatchObject({ ok: true, value: { quote: { subtotalCents: 5398, shippingCents: 399, taxCents: 432, totalCents: 6229 } } });

    const placed = await app.checkout.placeOrder(g1, { address, contactEmail: "a@example.test", payment, idempotencyKey: "k-offer" });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.value.items[0]).toMatchObject({ variantId: "var-kettle", sellerName: "Northwind Supply", fulfilment: "seller", offerId: "offer-kettle-nw" });

    // Stock came from the offer (3 -> 1); the first-party stock (5) is untouched.
    expect((await app.catalog.listOffers(["var-kettle"]))["var-kettle"].find((o) => o.offerId === "offer-kettle-nw")?.stock).toBe(1);
    expect((await app.catalog.getAvailability("var-kettle")).quantity).toBe(5);

    // The seller ships 3 hours late: still Placed (and cancellable) after the usual 5 minutes, shipped at 3 h 5 min.
    now += 10 * 60_000;
    const early = await app.orders.getOrder(g1, placed.value.id);
    expect(early).toMatchObject({ status: "placed", cancellable: true });
    expect(early?.estimatedDelivery).toEqual(new Date(new Date("2026-10-03T12:00:00Z").getTime() + (120 + 180) * 60_000));
    now = new Date("2026-10-03T12:00:00Z").getTime() + (180 + 5) * 60_000;
    expect((await app.orders.getOrder(g1, placed.value.id))?.status).toBe("shipped");

    // Cancelling inside the window returns the offer's stock, not the variant's.
    now = new Date("2026-10-03T12:00:00Z").getTime() + 60_000;
    expect((await app.checkout.cancelOrder(g1, placed.value.id)).ok).toBe(true);
    expect((await app.catalog.listOffers(["var-kettle"]))["var-kettle"].find((o) => o.offerId === "offer-kettle-nw")?.stock).toBe(3);
    expect((await app.catalog.getAvailability("var-kettle")).quantity).toBe(5);
  });

  it("T79: a mixed cart keeps the first-party shipping rule for first-party lines and adds seller shipping on top", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-mug", 1); // first-party 1,200: under the free-shipping threshold -> 499
    await app.cart.addItem(g1, "var-kettle", 1, "offer-kettle-nw"); // 2,699 + 399
    const quote = await app.checkout.getQuote(g1);
    expect(quote).toMatchObject({ ok: true, value: { quote: { subtotalCents: 3899, shippingCents: 499 + 399 } } });
  });
});
