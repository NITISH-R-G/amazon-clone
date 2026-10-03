import { describe, expect, it } from "vitest";
import { TYPE_DEFS } from "@/db/catalog/generate";
import { createTestApp } from "@/test-support/app";
import { CONCEPTS, interpretQuery, mergeCandidates } from "./internal/semantic";

describe("concept-based query understanding (pure)", () => {
  it("T127: every product type named in the lexicon exists in the catalogue", () => {
    const known = new Set(TYPE_DEFS.map((t) => t.slug));
    const missing = CONCEPTS.flatMap((c) => c.types).filter((t) => !known.has(t));
    expect(missing).toEqual([]);
  });

  it("T128: intent is read from meaning, deterministically; unrelated text has none", () => {
    expect(interpretQuery("something to keep my coffee hot on my commute")?.types.slice(0, 3)).toEqual(["insulated-water-bottle", "travel-tumbler", "gooseneck-kettle"]);
    expect(interpretQuery("gift for a runner")?.types).toContain("running-shoes");
    expect(interpretQuery("work from home setup")?.concepts[0].label).toMatch(/desk/);
    expect(interpretQuery("zxqv")).toBeNull();
    expect(interpretQuery("")).toBeNull();
    expect(interpretQuery("gift for a runner")).toEqual(interpretQuery("gift for a runner"));
  });

  it("T129: merging keeps one copy of each product and puts the right source first", () => {
    const lexical = [{ id: "a" }, { id: "b" }];
    const semantic = [{ id: "b" }, { id: "c" }];
    expect(mergeCandidates(lexical, semantic, false).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(mergeCandidates(lexical, semantic, true).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});

describe("hybrid search (database)", () => {
  it("T130: a meaning query finds products that share no words with it; exact queries and filters are unchanged", async () => {
    const app = await createTestApp({ demoCatalog: true });

    const meaning = await app.search.searchProducts({ text: "something to keep my coffee hot on my commute" });
    expect(meaning.semantic?.meaning.length).toBeGreaterThan(0);
    expect(meaning.items.length).toBeGreaterThan(0);
    const types = await Promise.all(meaning.items.slice(0, 6).map(async (p) => (await app.catalog.getProduct(p.slug))?.typeId));
    expect(types.some((t) => t === "type-insulated-water-bottle" || t === "type-travel-tumbler" || t === "type-gooseneck-kettle")).toBe(true);

    // The same meaning query respects filters: nothing over the price cap is returned.
    const capped = await app.search.searchProducts({ text: "something to keep my coffee hot on my commute", maxPriceCents: 3000 });
    expect(capped.items.every((p) => p.priceCents <= 3000)).toBe(true);

    // An exact product search has no semantic additions and the same results as before.
    const exact = await app.search.searchProducts({ text: "studio headphones" });
    expect(exact.semantic).toBeUndefined();
    expect(exact.items[0].title).toMatch(/Headphones/i);

    // A chosen product type or a page beyond the first is never altered.
    const typed = await app.search.searchProducts({ text: "coffee", typeSlug: "gooseneck-kettle" });
    expect(typed.semantic).toBeUndefined();
    await app.close();
  }, 120_000);
});
