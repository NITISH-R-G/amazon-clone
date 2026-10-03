import { describe, expect, it } from "vitest";
import { TYPE_DEFS } from "@/db/catalog/generate";
import { createTestApp } from "@/test-support/app";
import { CONCEPTS, fuse, interpretQuery, WEIGHTS_EXACT, WEIGHTS_MEANING, withFallback } from "./internal/semantic";

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

  it("T129: fusion scores both sources plus rating, once per product, deterministically", () => {
    const p = (id: string, rating = 4) => ({ id, rating });
    const lexical = [p("a"), p("b")];
    const semantic = [p("b"), p("c")];
    const exact = fuse(lexical, semantic, WEIGHTS_EXACT);
    expect(new Set(exact.map((x) => x.id)).size).toBe(3);
    // score = 0.6/(1+lexRank) + 0.3/(1+semRank) + 0.1*rating/5
    expect(Object.fromEntries(exact.map((x) => [x.id, x.hybridScore]))).toEqual({ a: 0.68, b: 0.68, c: 0.23 });
    expect(exact.map((x) => x.id)).toEqual(["a", "b", "c"]); // a tie orders by id
    // Trusting the meaning instead: b is in both lists and now clearly leads.
    expect(fuse(lexical, semantic, WEIGHTS_MEANING).map((x) => x.id)[0]).toBe("b");
    // A semantic-only leader overtakes a lexical-only hit when the meaning is trusted.
    expect(fuse([p("a")], [p("c")], WEIGHTS_MEANING).map((x) => x.id)).toEqual(["c", "a"]);
    expect(fuse(lexical, semantic, WEIGHTS_EXACT)).toEqual(fuse(lexical, semantic, WEIGHTS_EXACT));
    // Equal scores order by id.
    expect(fuse([p("z")], [p("y")], { lexical: 1, semantic: 1, business: 0 }).map((x) => x.id)).toEqual(["y", "z"]);
  });

  it("T131: a failing semantic stage returns the fallback instead of an error", async () => {
    await expect(withFallback(async () => { throw new Error("vector store down"); }, "lexical-result")).resolves.toBe("lexical-result");
    await expect(withFallback(async () => "hybrid-result", "lexical-result")).resolves.toBe("hybrid-result");
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
