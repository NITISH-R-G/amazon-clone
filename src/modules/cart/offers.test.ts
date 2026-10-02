import { describe, expect, it } from "vitest";
import { createTestApp } from "@/test-support/app";

const g1 = { guestToken: "g1" };

describe("cart with offers", () => {
  it("T75: an offer line takes its price, stock and seller from the offer; first-party and seller are separate lines", async () => {
    const app = await createTestApp();

    await app.cart.addItem(g1, "var-kettle", 1); // first-party (stock 5, 2,999)
    const added = await app.cart.addItem(g1, "var-kettle", 2, "offer-kettle-nw"); // marketplace (stock 3, 2,699)
    expect(added.ok).toBe(true);

    const cart = await app.cart.getCart(g1);
    expect(cart.lines).toHaveLength(2);
    const first = cart.lines.find((l) => l.offerId === null);
    const market = cart.lines.find((l) => l.offerId === "offer-kettle-nw");
    expect(first).toMatchObject({ sellerName: "Cartly", fulfilment: "cartly", unitPriceCents: 2999, shippingCents: 0, quantity: 1 });
    expect(market).toMatchObject({ sellerName: "Northwind Supply", fulfilment: "seller", unitPriceCents: 2699, shippingCents: 399, quantity: 2, lineTotalCents: 5398 });
    expect(cart.subtotalCents).toBe(2999 + 5398);

    // Adding the same offer again merges into its own line, clamped to the offer's stock (3), not the variant's (5).
    const more = await app.cart.addItem(g1, "var-kettle", 5, "offer-kettle-nw");
    expect(more.ok && more.value.lines.find((l) => l.offerId === "offer-kettle-nw")).toMatchObject({ quantity: 3, clamped: true });
  });

  it("T76: offers must belong to the variant and have stock", async () => {
    const app = await createTestApp();
    expect(await app.cart.addItem(g1, "var-mug", 1, "offer-kettle-nw")).toEqual({ ok: false, error: "OFFER_NOT_FOUND" });
    expect(await app.cart.addItem(g1, "var-kettle", 1, "no-such-offer")).toEqual({ ok: false, error: "OFFER_NOT_FOUND" });
    expect(await app.cart.addItem(g1, "var-kettle", 1, "offer-kettle-bw")).toEqual({ ok: false, error: "OUT_OF_STOCK" });
  });

  it("T77: a guest cart with seller lines merges into an account without mixing them with first-party lines", async () => {
    const app = await createTestApp();
    await app.cart.addItem({ userId: "u1" }, "var-kettle", 1);
    await app.cart.addItem(g1, "var-kettle", 1, "offer-kettle-nw");
    await app.cart.mergeGuestCart("g1", "u1");
    const lines = (await app.cart.getCart({ userId: "u1" })).lines;
    expect(lines.map((l) => [l.offerId, l.quantity]).sort()).toEqual([
      [null, 1],
      ["offer-kettle-nw", 1],
    ]);
  });
});
