import { describe, expect, it } from "vitest";
import { parseSearchParams, toSearchParams } from "@/modules/search";
import { createTestApp } from "@/test-support/app";

const slugs = (r: { items: { slug: string }[] }) => r.items.map((i) => i.slug);

describe("search params (pure)", () => {
  it("T26: parses and serialises the URL form, and falls back safely on bad input", () => {
    const query = parseSearchParams(
      new URLSearchParams("k=kettle&c=audio&min=25&max=130&r=4&stock=1&sale=1&sort=price-asc&page=2"),
    );
    expect(query).toMatchObject({
      text: "kettle",
      categorySlug: "audio",
      minPriceCents: 2500,
      maxPriceCents: 13000,
      minRating: 4,
      inStockOnly: true,
      onSale: true,
      sort: "price-asc",
      page: 2,
    });
    expect(toSearchParams(query).toString()).toBe(
      "k=kettle&c=audio&min=25&max=130&r=4&stock=1&sale=1&sort=price-asc&page=2",
    );

    const bad = parseSearchParams(new URLSearchParams("sort=bogus&page=-3&min=abc&r=9&k=%20%20"));
    expect(bad).toMatchObject({ sort: "featured", page: 1 });
    expect(bad.minPriceCents).toBeUndefined();
    expect(bad.minRating).toBeUndefined();
    expect(bad.text).toBeUndefined();
    expect(toSearchParams(bad).toString()).toBe("");
  });
});

describe("search", () => {
  it("T27: matches text across title, brand and category, case-insensitively", async () => {
    const app = await createTestApp({ searchFixtures: true });

    expect(slugs(await app.search.searchProducts({ text: "headphones" }))).toEqual(["studio-headphones"]);
    expect(slugs(await app.search.searchProducts({ text: "ORRIN" }))).toEqual(["studio-headphones", "pocket-speaker"]);
    expect(slugs(await app.search.searchProducts({ text: "audio" }))).toEqual(["studio-headphones", "pocket-speaker"]);
    expect(await app.search.searchProducts({ text: "zzzz" })).toMatchObject({ total: 0, items: [] });
  });

  it("T28: category, price, rating, stock and sale filters combine", async () => {
    const app = await createTestApp({ searchFixtures: true });

    expect(slugs(await app.search.searchProducts({ categorySlug: "audio" }))).toEqual(["studio-headphones", "pocket-speaker"]);
    expect(
      slugs(await app.search.searchProducts({ categorySlug: "audio", minPriceCents: 5000, maxPriceCents: 13000 })),
    ).toEqual(["studio-headphones"]);
    expect(slugs(await app.search.searchProducts({ minRating: 4.5 }))).toEqual([
      "studio-headphones",
      "linen-throw",
      "test-kettle",
    ]);
    expect((await app.search.searchProducts({ categorySlug: "home", inStockOnly: true })).total).toBe(0);
    expect(slugs(await app.search.searchProducts({ onSale: true }))).toEqual(["studio-headphones"]);
  });

  it("T33: a result summarises price, rating, availability and quick-add eligibility", async () => {
    const app = await createTestApp({ searchFixtures: true });

    const result = await app.search.searchProducts({ text: "test kettle" });

    expect(result.items[0]).toEqual({
      id: "prod-kettle",
      slug: "test-kettle",
      title: "Test Kettle",
      brand: "Testco",
      imageUrl: "/products/kettle.svg",
      imageAlt: "Test Kettle",
      priceCents: 2999,
      listPriceCents: null,
      rating: 4.5,
      ratingCount: 120,
      availability: "low_stock",
      categoryName: "Kitchen",
      singleVariantId: "var-kettle",
    });
  });

  it("T29: sorts by featured, price, rating and newest", async () => {
    const app = await createTestApp({ searchFixtures: true });
    const audio = (sort: "featured" | "price-asc" | "price-desc" | "rating" | "newest") =>
      app.search.searchProducts({ categorySlug: "audio", sort }).then(slugs);

    expect(await audio("featured")).toEqual(["studio-headphones", "pocket-speaker"]);
    expect(await audio("price-asc")).toEqual(["pocket-speaker", "studio-headphones"]);
    expect(await audio("price-desc")).toEqual(["studio-headphones", "pocket-speaker"]);
    expect(await audio("rating")).toEqual(["studio-headphones", "pocket-speaker"]);
    expect(await audio("newest")).toEqual(["pocket-speaker", "studio-headphones"]);
  });

  it("T30: paginates and clamps a page beyond the end", async () => {
    const app = await createTestApp({ searchFixtures: true });

    const second = await app.search.searchProducts({ pageSize: 2, page: 2 });
    expect(second).toMatchObject({ total: 7, pageCount: 4, page: 2, pageSize: 2 });
    expect(second.items).toHaveLength(2);

    const beyond = await app.search.searchProducts({ pageSize: 2, page: 99 });
    expect(beyond).toMatchObject({ page: 4, pageCount: 4 });
    expect(beyond.items).toHaveLength(1);
  });

  it("T31: counts categories for the current query, ignoring the category filter itself", async () => {
    const app = await createTestApp({ searchFixtures: true });

    const all = await app.search.searchProducts({});
    expect(all.facets.categories).toEqual([
      { slug: "kitchen", name: "Kitchen", count: 4 },
      { slug: "home", name: "Home", count: 1 },
      { slug: "audio", name: "Audio", count: 2 },
    ]);

    const orrin = await app.search.searchProducts({ text: "orrin", categorySlug: "audio" });
    expect(orrin.facets.categories).toEqual([{ slug: "audio", name: "Audio", count: 2 }]);
  });

  it("T32: suggests matching products and categories, limited and prefix-first", async () => {
    const app = await createTestApp({ searchFixtures: true });

    expect(await app.search.suggest("hea")).toEqual([
      { type: "product", label: "Studio Headphones", slug: "studio-headphones" },
    ]);
    expect(await app.search.suggest("aud")).toEqual([{ type: "category", label: "Audio", slug: "audio" }]);
    expect((await app.search.suggest("ke", 1)).length).toBe(1);
    expect(await app.search.suggest("")).toEqual([]);
  });
  it("T45: filler words are ignored and one-letter typos still find the product", async () => {
    const app = await createTestApp({ searchFixtures: true });

    expect(slugs(await app.search.searchProducts({ text: "pocket and the speaker" }))).toEqual(["pocket-speaker"]);

    const typo = await app.search.searchProducts({ text: "pockt speker" });
    expect(slugs(typo)).toEqual(["pocket-speaker"]);
    expect(typo.relaxed).toBe(false);

    // Short words are not fuzzed: "bag" must not match "bat", "tag" and the like.
    expect((await app.search.searchProducts({ text: "xyz" })).total).toBe(0);
  });

  it("T46: when no product has every word, results with some of the words are shown and flagged", async () => {
    const app = await createTestApp({ searchFixtures: true });

    const exact = await app.search.searchProducts({ text: "studio headphones" });
    expect(slugs(exact)).toEqual(["studio-headphones"]);
    expect(exact.relaxed).toBe(false);

    const relaxed = await app.search.searchProducts({ text: "headphones walnut" });
    expect(slugs(relaxed).sort()).toEqual(["studio-headphones", "walnut-cutting-board"]);
    expect(relaxed.relaxed).toBe(true);
  });

  it("T47: a query with nothing in common with the catalogue is empty and not flagged relaxed", async () => {
    const app = await createTestApp({ searchFixtures: true });
    const none = await app.search.searchProducts({ text: "something-that-does-not-exist" });
    expect(none).toMatchObject({ total: 0, relaxed: false });
  });
});
