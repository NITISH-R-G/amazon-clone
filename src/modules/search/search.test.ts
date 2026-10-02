import { describe, expect, it } from "vitest";
import { products, variants } from "@/db/schema";
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

    // One matching word out of four is coincidence, not a partial match.
    const weak = await app.search.searchProducts({ text: "zzzz blanket qqqq wwww" });
    expect(weak).toMatchObject({ total: 0, relaxed: false });
  });
  it("T52: a word in the title ranks above the same word only in the description", async () => {
    const app = await createTestApp({ searchFixtures: true });
    await app.db.insert(products).values({
      id: "p-organiser",
      slug: "cord-organiser",
      title: "Cord Organiser",
      brand: "Veld",
      description: "Keeps the cord of a kettle tidy on the counter.",
      images: [{ url: "/p/o.svg", alt: "Organiser" }],
      categoryId: "cat-home",
      ratingTenths: 50,
      ratingCount: 9000,
    });
    await app.db.insert(variants).values({ id: "v-organiser", productId: "p-organiser", priceCents: 900, stock: 4 });

    const result = await app.search.searchProducts({ text: "kettle" });
    // Both kettles have the word in the title; the organiser only in its description, however popular it is.
    expect(slugs(result).slice(0, 2).sort()).toEqual(["ceramic-kettle-pro", "test-kettle"]);
    expect(slugs(result)[2]).toBe("cord-organiser");
  });

  it("T53: brand filter and brand facets respect the other filters but not the brand filter itself", async () => {
    const app = await createTestApp({ searchFixtures: true });

    const all = await app.search.searchProducts({});
    expect(all.facets.brands).toEqual([
      { name: "Orrin", count: 2 },
      { name: "Testco", count: 2 },
      { name: "Veld", count: 2 },
      { name: "Kestrel", count: 1 },
    ]);

    expect(slugs(await app.search.searchProducts({ brands: ["Orrin"] }))).toEqual(["studio-headphones", "pocket-speaker"]);
    expect((await app.search.searchProducts({ brands: ["Orrin", "Kestrel"] })).total).toBe(3);

    const inAudio = await app.search.searchProducts({ categorySlug: "audio", brands: ["Veld"] });
    expect(inAudio.total).toBe(0);
    expect(inAudio.facets.brands).toEqual([{ name: "Orrin", count: 2 }]); // brand facet ignores the brand filter
    const orrin = await app.search.searchProducts({ brands: ["Orrin"] });
    expect(orrin.facets.categories).toEqual([{ slug: "audio", name: "Audio", count: 2 }]); // category facet respects it
  });

  it("T54: odd, empty and hostile queries never throw and never match by accident", async () => {
    const app = await createTestApp({ searchFixtures: true });
    const hostile = ["!!!", "()", "a:b|c&d", "'; drop table products; --", "\\", "%", " ", "x".repeat(5000), "the and of", "   ", "kettle'--"];
    for (const text of hostile) {
      const result = await app.search.searchProducts({ text });
      expect(result.total, JSON.stringify(text.slice(0, 20))).toBeGreaterThanOrEqual(0);
    }
    expect((await app.search.searchProducts({ text: "%" })).total).toBe(0);
    expect((await app.search.searchProducts({ text: "x".repeat(5000) })).total).toBe(0);
    expect(slugs(await app.search.searchProducts({ text: "pocket speakers" }))).toEqual(["pocket-speaker"]); // plural
    expect(slugs(await app.search.searchProducts({ text: "blue" }))).toEqual(["pocket-speaker"]); // prefix of "Bluetooth"
  });
});
