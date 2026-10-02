import { describe, expect, it } from "vitest";
import { createTestApp } from "@/test-support/app";

const g1 = { guestToken: "g1" };

describe("cart", () => {
  it("T2: adding an item puts a priced line in the actor's cart", async () => {
    const app = await createTestApp();

    const result = await app.cart.addItem(g1, "var-kettle", 2);
    expect(result.ok).toBe(true);

    const cart = await app.cart.getCart(g1);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({
      variantId: "var-kettle",
      productSlug: "test-kettle",
      quantity: 2,
      unitPriceCents: 2999,
      lineTotalCents: 5998,
    });
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotalCents).toBe(5998);
  });

  it("T3: adding the same variant again merges into one line", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 2);
    await app.cart.addItem(g1, "var-kettle", 1);

    const cart = await app.cart.getCart(g1);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
    expect(cart.subtotalCents).toBe(8997);
  });

  it("T4: a quantity above stock is clamped to stock and flagged", async () => {
    const app = await createTestApp();

    const result = await app.cart.addItem(g1, "var-kettle", 9); // stock is 5

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lines[0].quantity).toBe(5);
    expect(result.value.lines[0].clamped).toBe(true);
  });

  it("T5: carts are isolated per actor", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 2);

    const other = await app.cart.getCart({ guestToken: "g2" });

    expect(other.lines).toEqual([]);
    expect(other.itemCount).toBe(0);
  });

  it("T14: rejects a quantity that is not a positive integer", async () => {
    const app = await createTestApp();

    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(await app.cart.addItem(g1, "var-kettle", bad)).toEqual({ ok: false, error: "INVALID_QUANTITY" });
    }
    expect((await app.cart.getCart(g1)).lines).toEqual([]);
  });

  it("T15: refuses to add a variant that is out of stock", async () => {
    const app = await createTestApp();
    const g2 = { guestToken: "g2" };
    await app.cart.addItem(g2, "var-mug", 1); // the only mug
    const bought = await app.checkout.placeOrder(g2, {
      address: { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" },
      contactEmail: "a@example.test",
      payment: { number: "4242424242424242", expiry: "12/30", cvc: "123" },
      idempotencyKey: "k-mug",
    });
    expect(bought.ok).toBe(true);

    expect(await app.cart.addItem(g1, "var-mug", 1)).toEqual({ ok: false, error: "OUT_OF_STOCK" });
  });

  it("T16: setting a quantity updates the line and clamps to stock", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 2);
    const lineId = (await app.cart.getCart(g1)).lines[0].id;

    const updated = await app.cart.setQuantity(g1, lineId, 4);
    expect(updated.ok && updated.value.lines[0].quantity).toBe(4);

    const clamped = await app.cart.setQuantity(g1, lineId, 9); // stock is 5
    expect(clamped.ok && clamped.value.lines[0]).toMatchObject({ quantity: 5, clamped: true });
  });

  it("T17: a removed line can be restored", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 2);
    const lineId = (await app.cart.getCart(g1)).lines[0].id;

    await app.cart.removeItem(g1, lineId);
    expect((await app.cart.getCart(g1)).lines).toEqual([]);

    const restored = await app.cart.restoreItem(g1, lineId);
    expect(restored.ok && restored.value.lines[0].quantity).toBe(2);
  });

  it("T18: setting a quantity validates it and only touches the actor's own lines", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 2);
    const lineId = (await app.cart.getCart(g1)).lines[0].id;
    const g2 = { guestToken: "g2" };

    expect(await app.cart.setQuantity(g1, lineId, 0)).toEqual({ ok: false, error: "INVALID_QUANTITY" });
    expect(await app.cart.setQuantity(g2, lineId, 3)).toEqual({ ok: false, error: "LINE_NOT_FOUND" });
    expect((await app.cart.getCart(g1)).lines[0].quantity).toBe(2);
  });

  it("T19: adding an item again after removing it starts from the new quantity", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 2);
    const lineId = (await app.cart.getCart(g1)).lines[0].id;
    await app.cart.removeItem(g1, lineId);

    await app.cart.addItem(g1, "var-kettle", 1);

    const cart = await app.cart.getCart(g1);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(1);
  });

  it("T35: a line carries the list price when the variant is on sale", async () => {
    const app = await createTestApp({ searchFixtures: true });
    await app.cart.addItem(g1, "v-headphones", 1);
    await app.cart.addItem(g1, "var-kettle", 1);

    const [sale, regular] = (await app.cart.getCart(g1)).lines;

    expect(sale).toMatchObject({ unitPriceCents: 12900, listPriceCents: 14900 });
    expect(regular.listPriceCents).toBeNull();
  });
  it("T41: merging a guest cart into an account cart sums matching lines, clamped to stock, and empties the guest cart", async () => {
    const app = await createTestApp();
    const user = { userId: "u1" };
    await app.cart.addItem(user, "var-kettle", 3);
    await app.cart.addItem(g1, "var-kettle", 4); // stock is 5: 3 + 4 clamps to 5
    await app.cart.addItem(g1, "var-mug", 1);

    await app.cart.mergeGuestCart("g1", "u1");

    const cart = await app.cart.getCart(user);
    expect(cart.lines.map((l) => [l.variantId, l.quantity]).sort()).toEqual([
      ["var-kettle", 5],
      ["var-mug", 1],
    ]);
    expect((await app.cart.getCart(g1)).lines).toHaveLength(0);
  });

  it("T42: merging a guest cart into an empty account moves the lines, and a guest with no cart is a no-op", async () => {
    const app = await createTestApp();
    await app.cart.addItem(g1, "var-kettle", 2);
    await app.cart.mergeGuestCart("g1", "u2");
    await app.cart.mergeGuestCart("nobody", "u2");
    expect((await app.cart.getCart({ userId: "u2" })).lines[0]).toMatchObject({ variantId: "var-kettle", quantity: 2 });
  });
});

