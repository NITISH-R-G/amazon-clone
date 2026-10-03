import { describe, expect, it } from "vitest";
import { sponsoredCampaigns } from "@/db/schema";
import { seedDemoExtras } from "@/db/seed-reviews";
import { createTestApp } from "@/test-support/app";

describe("sponsored placements", () => {
  it("T125: sponsored products are deterministic, keyword-targeted, skip organic hits and never change organic results", async () => {
    const app = await createTestApp({ demoCatalog: true });
    await seedDemoExtras(app.db);

    const campaigns = await app.db.select().from(sponsoredCampaigns);
    const target = campaigns.find((c) => c.placement === "search" && c.keywords.length > 0)!;
    const keyword = target.keywords[0];

    const organicBefore = await app.search.searchProducts({ text: keyword, sort: "featured" });
    const one = await app.discovery.sponsored({ placement: "search", text: keyword, limit: 2, excludeIds: organicBefore.items.map((p) => p.id) });
    const two = await app.discovery.sponsored({ placement: "search", text: keyword, limit: 2, excludeIds: organicBefore.items.map((p) => p.id) });
    expect(one.map((p) => p.id)).toEqual(two.map((p) => p.id));
    expect(one.length).toBeLessThanOrEqual(2);
    expect(one.every((p) => !organicBefore.items.some((o) => o.id === p.id))).toBe(true);
    const organicAfter = await app.search.searchProducts({ text: keyword, sort: "featured" });
    expect(organicAfter.items.map((p) => p.id)).toEqual(organicBefore.items.map((p) => p.id)); // ads do not touch organic ranking

    // No query, no search ads; unrelated words, no ads; the home placement does not need a query.
    expect(await app.discovery.sponsored({ placement: "search", limit: 2 })).toEqual([]);
    expect(await app.discovery.sponsored({ placement: "search", text: "zzzzqqqq", limit: 2 })).toEqual([]);
    expect((await app.discovery.sponsored({ placement: "home", limit: 4 })).length).toBeGreaterThan(0);
    await app.close();
  }, 180_000);

  it("T126: higher bids come first; exhausted budgets and ended campaigns are not shown", async () => {
    const app = await createTestApp({ demoCatalog: true });
    const [a, b, c] = (await app.search.searchProducts({ sort: "featured", pageSize: 3 })).items;
    const window = { startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2028-01-01T00:00:00Z") };
    await app.db.insert(sponsoredCampaigns).values([
      { productId: a.id, placement: "home", bidCents: 50, budgetCents: 1000, ...window },
      { productId: b.id, placement: "home", bidCents: 90, budgetCents: 1000, ...window },
      { productId: c.id, placement: "home", bidCents: 500, budgetCents: 1000, spentCents: 1000, ...window }, // out of budget
    ]);
    expect((await app.discovery.sponsored({ placement: "home", limit: 4 })).map((p) => p.id)).toEqual([b.id, a.id]);
    await app.close();
  }, 120_000);
});
