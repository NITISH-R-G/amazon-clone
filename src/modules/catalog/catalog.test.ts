import { describe, expect, it } from "vitest";
import { availabilityState } from "@/modules/catalog";
import { createTestApp } from "@/test-support/app";

describe("catalog", () => {
  it("T1: returns a product by slug with its price and stock, and null for an unknown slug", async () => {
    const app = await createTestApp();

    const product = await app.catalog.getProduct("test-kettle");
    expect(product?.title).toBe("Test Kettle");
    expect(product?.variants).toEqual([
      expect.objectContaining({ id: "var-kettle", priceCents: 2999, stock: 5 }),
    ]);

    expect(await app.catalog.getProduct("nope")).toBeNull();
  });

  it("T22: lists products with their variants, ordered by title", async () => {
    const app = await createTestApp();

    const list = await app.catalog.listProducts();

    expect(list.map((p) => p.slug)).toEqual(["test-kettle", "test-mug"]);
    expect(list[0].variants[0].priceCents).toBe(2999);
  });

  it("T23: lists categories in display order", async () => {
    const app = await createTestApp();

    const categories = await app.catalog.listCategories();

    expect(categories.map((c) => [c.slug, c.name])).toEqual([
      ["kitchen", "Kitchen"],
      ["home", "Home"],
    ]);
  });

  it("T24: a product carries its category, rating, bullets and option name", async () => {
    const app = await createTestApp();

    const kettle = await app.catalog.getProduct("test-kettle");

    expect(kettle).toMatchObject({
      categoryId: "cat-kitchen",
      rating: 4.5,
      ratingCount: 120,
      bullets: ["Boils in minutes"],
      optionName: null,
    });
  });
});

describe("availabilityState", () => {
  it("T25: maps stock to out, low (1 to 5) and in stock", () => {
    expect(availabilityState(0)).toBe("out_of_stock");
    expect(availabilityState(1)).toBe("low_stock");
    expect(availabilityState(5)).toBe("low_stock");
    expect(availabilityState(6)).toBe("in_stock");
  });
});
