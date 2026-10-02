import { beforeAll, describe, expect, it } from "vitest";
import { parseSearchParams, toSearchParams } from "@/modules/search";
import { createTestApp } from "@/test-support/app";

// Structured attributes need real types, so these run on the seeded demo catalogue (one database for the file).
let app: Awaited<ReturnType<typeof createTestApp>>;
beforeAll(async () => {
  app = await createTestApp({ demoCatalog: true });
});

describe("structured search: types and attributes", () => {
  it("T69: a department lists its product types with counts, and a type narrows the results", async () => {
    const all = await app.search.searchProducts({ categorySlug: "electronics", pageSize: 1 });
    const types = all.facets.types;
    expect(types.map((t) => t.slug).sort()).toEqual(["laptops", "smartphones", "tablets", "televisions"]);
    expect(types.reduce((n, t) => n + t.count, 0)).toBe(all.total);

    const phones = await app.search.searchProducts({ categorySlug: "electronics", typeSlug: "smartphones", pageSize: 1 });
    expect(phones.total).toBe(types.find((t) => t.slug === "smartphones")?.count);
    // The type facet ignores its own filter: the other types are still offered.
    expect(phones.facets.types.map((t) => t.slug).sort()).toEqual(["laptops", "smartphones", "tablets", "televisions"]);
  });

  it("T70: a type brings its own attribute facets; each facet ignores its own filter and respects the others", async () => {
    const phones = await app.search.searchProducts({ typeSlug: "smartphones", pageSize: 1 });
    const byKey = new Map(phones.facets.attributes.map((f) => [f.key, f]));
    expect([...byKey.keys()]).toEqual(expect.arrayContaining(["processor", "display_size", "refresh_rate", "storage_type", "material"]));
    expect(byKey.get("refresh_rate")?.label).toBe("Refresh rate");
    // Values come in the vocabulary's order, with counts.
    expect(byKey.get("refresh_rate")?.values.map((v) => v.value)).toEqual(["60 Hz", "90 Hz", "120 Hz", "144 Hz"]);
    expect(byKey.get("refresh_rate")?.values.reduce((n, v) => n + v.count, 0)).toBe(phones.total);

    const hz120 = byKey.get("refresh_rate")?.values.find((v) => v.value === "120 Hz")?.count as number;
    const narrowed = await app.search.searchProducts({ typeSlug: "smartphones", attributes: { refresh_rate: ["120 Hz"] }, pageSize: 1 });
    expect(narrowed.total).toBe(hz120);
    // Its own facet still shows every value; another facet now counts only the narrowed set.
    const nBy = new Map(narrowed.facets.attributes.map((f) => [f.key, f]));
    expect(nBy.get("refresh_rate")?.values.length).toBe(4);
    expect(nBy.get("display_size")?.values.reduce((n, v) => n + v.count, 0)).toBe(hz120);

    // Two values of one attribute are alternatives (or); two attributes combine (and).
    const either = await app.search.searchProducts({ typeSlug: "smartphones", attributes: { refresh_rate: ["120 Hz", "144 Hz"] }, pageSize: 1 });
    expect(either.total).toBeGreaterThan(hz120);
    const both = await app.search.searchProducts({
      typeSlug: "smartphones",
      attributes: { refresh_rate: ["120 Hz", "144 Hz"], display_size: ["6.7 in"] },
      pageSize: 1,
    });
    expect(both.total).toBeLessThan(either.total);
  });

  it("T71: unknown or unsafe attribute keys are ignored, and attributes need a type", async () => {
    const plain = await app.search.searchProducts({ typeSlug: "smartphones", pageSize: 1 });
    const cases: Record<string, string[]>[] = [{ nope: ["x"] }, { "x'; drop table products; --": ["a"] }, { model: ["AR-1"] }];
    for (const attributes of cases) {
      expect((await app.search.searchProducts({ typeSlug: "smartphones", attributes, pageSize: 1 })).total).toBe(plain.total);
    }
    const noType = await app.search.searchProducts({ pageSize: 1 });
    expect((await app.search.searchProducts({ attributes: { refresh_rate: ["120 Hz"] }, pageSize: 1 })).total).toBe(noType.total);
    expect((await app.search.searchProducts({ typeSlug: "no-such-type", pageSize: 1 })).total).toBe(0);
  });

  it("T72: type and attributes live in the URL and survive a round trip; junk is dropped", () => {
    const query = parseSearchParams(new URLSearchParams("c=electronics&t=smartphones&a.ram=8%20GB&a.ram=12%20GB&a.display_size=6.7%20in"));
    expect(query).toMatchObject({ categorySlug: "electronics", typeSlug: "smartphones", attributes: { ram: ["8 GB", "12 GB"], display_size: ["6.7 in"] } });
    expect(toSearchParams(query).toString()).toBe("c=electronics&t=smartphones&a.ram=8+GB&a.ram=12+GB&a.display_size=6.7+in");

    const junk = parseSearchParams(new URLSearchParams("t=Bad%20Slug!&a.x%27y=1&a.ok=&a.fine=v"));
    expect(junk.typeSlug).toBeUndefined();
    expect(junk.attributes).toEqual({ fine: ["v"] });
  });

  it("T73: free text also finds products by an attribute value", async () => {
    // "Titanium" is a frame material, not a word in any smartphone title.
    const result = await app.search.searchProducts({ text: "titanium smartphone", pageSize: 12 });
    expect(result.total).toBeGreaterThan(5);
    expect(result.items.every((i) => /smartphone/i.test(i.title))).toBe(true);
  });
});
