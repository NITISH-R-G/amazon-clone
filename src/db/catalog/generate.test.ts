import { describe, expect, it } from "vitest";
import { CATALOG_SIZE, generateCatalog, TYPE_DEFS } from "./generate";
import curated from "../demo-catalog.json";

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
    expect([...byCategory.keys()].sort()).toEqual(["audio", "desk", "electronics", "fashion", "furniture", "home", "kitchen", "travel", "wearables"]);
    for (const [category, n] of byCategory) expect(n, category).toBeGreaterThanOrEqual(100);

    const brands = new Set(catalog.map((p) => p.brand));
    expect(brands.size).toBeGreaterThanOrEqual(95);

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
  it("T64: structural depth: about 43 product types, about 100 invented brands, thousands of real variants with unique SKUs", () => {
    expect(TYPE_DEFS.length).toBeGreaterThanOrEqual(43);
    const usedTypes = new Set(catalog.map((p) => p.typeSlug));
    expect(usedTypes.size).toBe(TYPE_DEFS.length);

    const variants = catalog.flatMap((p) => p.variants);
    const curatedVariants = curated.products.reduce((n, p) => n + (("variants" in p && p.variants) ? p.variants.length : 1), 0);
    expect(variants.length + curatedVariants).toBeGreaterThanOrEqual(7000);
    expect(variants.length + curatedVariants).toBeLessThanOrEqual(10000);

    const skus = new Set(variants.map((v) => v.sku));
    expect(skus.size).toBe(variants.length);
    const dimensions = (p: (typeof catalog)[number]) => Object.keys(p.variants[0].selections).length;
    expect(catalog.filter((p) => dimensions(p) >= 3).length).toBeGreaterThan(100);
  });

  it("T65: variants are valid combinations of their type's variation dimensions, and attributes follow the type", () => {
    const types = new Map(TYPE_DEFS.map((t) => [t.slug, t]));
    for (const p of catalog) {
      const type = types.get(p.typeSlug);
      expect(type, p.slug).toBeDefined();
      if (!type) continue;
      const dims = type.attrs.filter((a) => a.role === "variation");
      const seen = new Set<string>();
      for (const v of p.variants) {
        if (Object.keys(v.selections).length === 0) {
          expect(p.variants.length, `${p.slug}: only a single-variant product may have no selections`).toBe(1);
        } else {
          expect(Object.keys(v.selections).sort(), v.sku).toEqual(dims.map((d) => d.key).sort());
          for (const d of dims) expect(d.values, `${v.sku} ${d.key}`).toContain(v.selections[d.key]);
        }
        const combo = JSON.stringify(v.selections);
        expect(seen.has(combo), `duplicate combination in ${p.slug}`).toBe(false);
        seen.add(combo);
        expect(v.label === null ? Object.keys(v.selections).length === 0 : v.label.length > 0, v.sku).toBe(true);
      }
      const specKeys = type.attrs.filter((a) => a.role === "spec").map((a) => a.key);
      for (const key of specKeys) expect(p.attributes[key], `${p.slug} ${key}`).toBeTruthy();
      for (const key of Object.keys(p.attributes)) expect(specKeys, `${p.slug} ${key}`).toContain(key);
    }
  });

  it("T66: a rich phone has colour, storage and RAM variants whose price, stock and picture differ", () => {
    const phones = catalog.filter((p) => p.typeSlug === "smartphones");
    expect(phones.length).toBeGreaterThanOrEqual(60);
    const phone = phones.find((p) => p.variants.length >= 8);
    expect(phone).toBeDefined();
    if (!phone) return;
    expect(Object.keys(phone.variants[0].selections).sort()).toEqual(["color", "ram", "storage"]);
    // Attributes a phone needs, and none that belong to other categories.
    for (const key of ["processor", "gpu", "display_size", "refresh_rate", "battery", "material", "storage_type"]) {
      expect(phone.attributes[key], key).toBeTruthy();
    }
    const prices = new Set(phone.variants.map((v) => v.price));
    expect(prices.size).toBeGreaterThan(2); // storage and RAM change the price
    const byColor = new Map(phone.variants.map((v) => [v.selections.color, v.tone]));
    expect(new Set(byColor.values()).size).toBe(byColor.size); // each colour has its own picture
    const small = phone.variants.filter((v) => v.selections.storage === "128 GB");
    const large = phone.variants.filter((v) => v.selections.storage === "1 TB" || v.selections.storage === "512 GB");
    if (small.length && large.length) expect(Math.min(...large.map((v) => v.price))).toBeGreaterThan(Math.min(...small.map((v) => v.price)));
  });
});
