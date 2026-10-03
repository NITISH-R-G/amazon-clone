import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNT, seedDemoExtras } from "@/db/seed-reviews";
import { createTestApp } from "@/test-support/app";

describe("verified reviews", () => {
  it("T123: only a user with a delivered order of the product can review it, once; the aggregate follows", async () => {
    const app = await createTestApp({ demoCatalog: true });
    await seedDemoExtras(app.db);

    // Seeded: every product has reviews and its rating is their real aggregate.
    const products = await app.catalog.listProducts();
    const sample = products[5];
    const summary = await app.reviews.summary(sample.id);
    expect(summary.count).toBeGreaterThanOrEqual(2);
    expect(sample.ratingCount).toBe(summary.count);
    expect(Math.round(sample.rating * 10)).toBe(Math.round(summary.average * 10));
    expect(summary.distribution.reduce((a, b) => a + b, 0)).toBe(summary.count);

    // The demo account has delivered orders.
    const session = await app.auth.signIn({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
    if (!session.ok) throw new Error("demo account missing");
    const user = session.value.user;
    const orders = await app.orders.listOrders({ userId: user.id });
    expect(orders.length).toBe(3);
    expect(orders.every((o) => o.status === "delivered")).toBe(true);

    const bought = await app.catalog.getVariant(orders[0].items[0].variantId);
    const slug = bought!.productSlug;
    const product = (await app.catalog.getProduct(slug))!;
    const before = await app.reviews.summary(product.id);

    // A product the user never bought is refused; a bad body is refused.
    const other = products.find((p) => !orders.some((o) => o.items.some((i) => p.variants.some((v) => v.id === i.variantId))))!;
    expect(await app.reviews.submit(user, other.slug, { rating: 5, title: "Nice", body: "A perfectly fine long review body." })).toEqual({ ok: false, error: "NOT_ELIGIBLE" });
    expect(await app.reviews.submit(user, slug, { rating: 9, title: "", body: "short" })).toEqual({ ok: false, error: "INVALID" });

    const posted = await app.reviews.submit(user, slug, { rating: 5, title: "Delivered and great", body: "Bought it last week, arrived on time and works well." });
    expect(posted).toMatchObject({ ok: true, value: { verified: true, rating: 5, authorName: user.name } });
    expect(await app.reviews.submit(user, slug, { rating: 4, title: "Again", body: "Trying to review the same product twice." })).toEqual({ ok: false, error: "ALREADY_REVIEWED" });

    const after = await app.reviews.summary(product.id);
    expect(after.count).toBe(before.count + 1);
    expect((await app.catalog.getProduct(slug))?.ratingCount).toBe(after.count);
    expect((await app.reviews.list(product.id, 1))[0].title).toBe("Delivered and great");
    await app.close();
  }, 180_000);

  it("T124: an undelivered order does not make a user eligible", async () => {
    const app = await createTestApp();
    const user = await app.auth.register({ name: "Buyer", email: "buyer@example.test", password: "a-long-password" });
    if (!user.ok) throw new Error("register failed");
    const actor = { userId: user.value.id };
    await app.cart.addItem(actor, "var-kettle", 1);
    const address = { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" };
    const placed = await app.checkout.placeOrder(actor, { address, contactEmail: "b@example.test", payment: { number: "4242424242424242", expiry: "12/30", cvc: "123" }, idempotencyKey: "k-rev" });
    expect(placed.ok).toBe(true);
    const product = (await app.catalog.getProduct("kettle")) ?? (await app.catalog.listProducts()).find((p) => p.variants.some((v) => v.id === "var-kettle"))!;
    expect(await app.reviews.submit(user.value, product.slug, { rating: 5, title: "Too early", body: "I have not even received it yet." })).toEqual({ ok: false, error: "NOT_ELIGIBLE" });
    await app.close();
  }, 120_000);
});
