import { describe, expect, it } from "vitest";
import { createTestApp } from "@/test-support/app";
import { fakePaymentProvider, fixedIds } from "@/test-support/fakes";

const g1 = { guestToken: "g1" };
const g2 = { guestToken: "g2" };

describe("orders", () => {
  it("T12: an order is visible only to its owner", async () => {
    const app = await createTestApp({
      ids: fixedIds({ orderNumbers: ["ORD-0001"] }),
      payments: fakePaymentProvider({ status: "approved", reference: "pay-1", brand: "visa", last4: "4242" }),
    });
    await app.cart.addItem(g1, "var-kettle", 2);
    const placed = await app.checkout.placeOrder(g1, {
      address: { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" },
      contactEmail: "a@example.test",
      payment: { number: "4242424242424242", expiry: "12/30", cvc: "123" },
      idempotencyKey: "k1",
    });
    if (!placed.ok) throw new Error("setup failed: order not placed");

    expect((await app.orders.getOrder(g1, placed.value.id))?.number).toBe("ORD-0001");
    expect(await app.orders.getOrder(g2, placed.value.id)).toBeNull();
  });
});
