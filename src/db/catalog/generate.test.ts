import { describe, expect, it } from "vitest";
import { CATALOG_SIZE, generateCatalog } from "./generate";

describe("generated catalogue", () => {
  const catalog = generateCatalog();

  it("T49: is deterministic and fills the catalogue to the target size", () => {
    expect(catalog).toHaveLength(CATALOG_SIZE - 30); // plus the 30 curated products
    expect(generateCatalog()).toEqual(catalog);
  });

  it("T50: every product is internally consistent and purchasable", () => {
    const slugs = new Set<string>();
    const titles = new Set<string>();
    const variantIds = new Set<string>();
    for (const p of catalog) {
      expect(slugs.has(p.slug), `duplicate slug ${p.slug}`).toBe(false);
      slugs.add(p.slug);
      expect(titles.has(p.title), `duplicate title ${p.title}`).toBe(false);
      titles.add(p.title);
      expect(p.title.startsWith(p.brand), p.title).toBe(true);
      expect(p.description.length, p.slug).toBeGreaterThan(60);
      expect(p.bullets.length, p.slug).toBeGreaterThanOrEqual(3);
      expect(p.specs.length, p.slug).toBeGreaterThanOrEqual(4);
      expect(p.rating, p.slug).toBeGreaterThanOrEqual(30);
      expect(p.rating, p.slug).toBeLessThanOrEqual(50);
      expect(p.count, p.slug).toBeGreaterThan(0);
      expect(p.variants.length, p.slug).toBeGreaterThan(0);
      if (p.variants.length > 1) expect(p.optionName, p.slug).not.toBeNull();
      for (const v of p.variants) {
        expect(variantIds.has(v.id), `duplicate variant ${v.id}`).toBe(false);
        variantIds.add(v.id);
        expect(Number.isInteger(v.price) && v.price >= 500, v.id).toBe(true);
        expect(Number.isInteger(v.stock) && v.stock >= 0, v.id).toBe(true);
        if (v.list !== null) expect(v.list, v.id).toBeGreaterThan(v.price);
      }
    }
  });

  it("T51: the catalogue has believable depth: every department is large, prices and stock vary, some items are on sale or sold out", () => {
    const byCategory = new Map<string, number>();
    for (const p of catalog) byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
    expect([...byCategory.keys()].sort()).toEqual(["audio", "desk", "home", "kitchen", "travel", "wearables"]);
    for (const [category, n] of byCategory) expect(n, category).toBeGreaterThanOrEqual(250);

    const brands = new Set(catalog.map((p) => p.brand));
    expect(brands.size).toBeGreaterThanOrEqual(30);

    const onSale = catalog.filter((p) => p.variants.some((v) => v.list !== null)).length;
    const soldOut = catalog.filter((p) => p.variants.every((v) => v.stock === 0)).length;
    const multi = catalog.filter((p) => p.variants.length > 1).length;
    expect(onSale / catalog.length).toBeGreaterThan(0.15);
    expect(onSale / catalog.length).toBeLessThan(0.45);
    expect(soldOut / catalog.length).toBeGreaterThan(0.01);
    expect(soldOut / catalog.length).toBeLessThan(0.1);
    expect(multi / catalog.length).toBeGreaterThan(0.1);
    const prices = catalog.map((p) => p.variants[0].price);
    expect(Math.max(...prices)).toBeGreaterThan(Math.min(...prices) * 20);
  });
});
