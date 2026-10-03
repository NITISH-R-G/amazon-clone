import { describe, expect, it } from "vitest";
import { createTestApp } from "@/test-support/app";
import { applyCoupon, type Promotion } from "./internal/coupons";

const promo = (over: Partial<Promotion> = {}): Promotion => ({
  code: "X",
  label: "x",
  kind: "percent",
  value: 10,
  minSubtotalCents: 5000,
  startsAt: new Date("2026-01-01T00:00:00Z"),
  endsAt: new Date("2026-12-31T00:00:00Z"),
  ...over,
});
const now = new Date("2026-10-03T12:00:00Z");

describe("coupons (pure rules)", () => {
  it("T119: percent rounds down, fixed is capped at the subtotal, and the rules are checked in order", () => {
    expect(applyCoupon(promo(), 5999, now)).toMatchObject({ ok: true, coupon: { discountCents: 599 } });
    expect(applyCoupon(promo({ kind: "fixed", value: 500, minSubtotalCents: 0 }), 300, now)).toMatchObject({ ok: true, coupon: { discountCents: 300 } });
    expect(applyCoupon(null, 9999, now)).toEqual({ ok: false, error: "UNKNOWN_CODE" });
    expect(applyCoupon(promo({ startsAt: new Date("2027-01-01T00:00:00Z"), endsAt: new Date("2027-02-01T00:00:00Z") }), 9999, now)).toMatchObject({ error: "NOT_STARTED" });
    expect(applyCoupon(promo({ endsAt: new Date("2026-10-03T12:00:00Z") }), 9999, now)).toMatchObject({ error: "EXPIRED" });
    expect(applyCoupon(promo(), 4999, now)).toEqual({ ok: false, error: "MIN_SPEND", minSubtotalCents: 5000 });
  });
});

describe("coupons through checkout (server-side pricing)", () => {
  const g1 = { guestToken: "g1" };
  const address = { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" };

  it("T120: a valid code lowers the order total (tax follows the discounted items) and the order records it", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 1);
    const quote = await app.checkout.getQuote(g1, "welcome5"); // case-insensitive
    expect(quote).toMatchObject({ ok: true, value: { coupon: { code: "WELCOME5", discountCents: 500 }, quote: { subtotalCents: 2999, discountCents: 500, taxCents: 200, totalCents: 3198 } } });

    const started = await app.checkout.startCheckout(g1, { address, contactEmail: "a@example.test", couponCode: "WELCOME5", idempotencyKey: "k1" });
    if (!started.ok) throw new Error(started.error);
    expect(started.value.order).toMatchObject({ totalCents: 3198, discountCents: 500, couponCode: "WELCOME5" });
    expect(started.value.payment.amountCents).toBe(3198); // the payment is for the discounted amount
    await app.close();
  });

  it("T121: an expired, unknown or under-minimum code is refused with a reason and never changes the price", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 1);
    for (const [code, error] of [["SPRING20", "EXPIRED"], ["NOPE", "UNKNOWN_CODE"], ["SAVE10", "MIN_SPEND"]] as const) {
      expect(await app.checkout.getQuote(g1, code)).toMatchObject({ ok: true, value: { coupon: null, couponError: error, quote: { discountCents: 0, totalCents: 3738 } } });
      expect(await app.checkout.startCheckout(g1, { address, contactEmail: "a@example.test", couponCode: code, idempotencyKey: `k-${code}` })).toEqual({ ok: false, error });
    }
    await app.close();
  });
});
