import { describe, expect, it } from "vitest";
import type { Clock } from "@/lib/ports";
import { createTestApp } from "@/test-support/app";
import { rank, scoreCandidate, type Candidate, type Signals } from "./score";

const seed: Signals = { id: "s", typeId: "t1", categoryId: "c1", brand: "Acme", priceCents: 10_000, attributes: { color: "Black" } };
const cand = (over: Partial<Candidate>): Candidate => ({ ...seed, id: "x", rating: 4, ratingCount: 100, onSale: false, inStock: true, ...over });

describe("recommendation scoring (pure, deterministic)", () => {
  it("T114: same type beats same category beats unrelated; price proximity and brand matter; ties break on id", () => {
    const sameType = cand({ id: "a" });
    const sameCategory = cand({ id: "b", typeId: "t2", brand: "Other", attributes: {} });
    const unrelated = cand({ id: "c", typeId: "t3", categoryId: "c9", brand: "Other", attributes: {} });
    expect(rank([seed], [unrelated, sameCategory, sameType], 3).map((c) => c.id)).toEqual(["a", "b", "c"]);

    const near = cand({ id: "n", priceCents: 10_500 });
    const far = cand({ id: "f", priceCents: 90_000 });
    expect(scoreCandidate([seed], near)).toBeGreaterThan(scoreCandidate([seed], far));

    const twinA = cand({ id: "ta" });
    const twinB = cand({ id: "tb" });
    expect(rank([seed], [twinB, twinA], 2).map((c) => c.id)).toEqual(["ta", "tb"]);
  });

  it("T115: the seed itself and out-of-stock products are never recommended; the limit applies", () => {
    const out = rank([seed], [cand({ id: "s" }), cand({ id: "gone", inStock: false }), cand({ id: "ok1" }), cand({ id: "ok2" })], 1);
    expect(out.map((c) => c.id)).toEqual(["ok1"]);
  });

  it("T116: with several seeds the most recent one counts most", () => {
    const recent: Signals = { ...seed, id: "r1", typeId: "tA", categoryId: "cA", brand: "B1", attributes: {} };
    const older: Signals = { ...seed, id: "r2", typeId: "tB", categoryId: "cB", brand: "B2", attributes: {} };
    const likeRecent = cand({ id: "lr", typeId: "tA", categoryId: "cA", brand: "B1", attributes: {} });
    const likeOlder = cand({ id: "lo", typeId: "tB", categoryId: "cB", brand: "B2", attributes: {} });
    expect(rank([recent, older], [likeOlder, likeRecent], 2).map((c) => c.id)).toEqual(["lr", "lo"]);
  });
});

describe("recently viewed and recommendations (database)", () => {
  it("T117: views are per actor, newest first, deduplicated, and excluded on the current product", async () => {
    let now = Date.parse("2026-10-03T12:00:00Z");
    const clock: Clock = { now: () => new Date(now) };
    const app = await createTestApp({ demoCatalog: true, clock });
    const g1 = { guestToken: "g1" };
    const g2 = { guestToken: "g2" };
    const page = await app.search.searchProducts({ sort: "featured", pageSize: 3 });
    const [a, b, c] = page.items;

    for (const p of [a, b, c, a]) {
      await app.discovery.recordView(g1, p.id);
      now += 1000;
    }
    expect((await app.discovery.recentlyViewed(g1)).map((p) => p.id)).toEqual([a.id, c.id, b.id]);
    expect((await app.discovery.recentlyViewed(g1, 8, a.id)).map((p) => p.id)).toEqual([c.id, b.id]);
    expect(await app.discovery.recentlyViewed(g2)).toEqual([]);
    expect(await app.discovery.recentlyViewed(null)).toEqual([]);
    expect(await app.discovery.hasHistory(g1)).toBe(true);
    expect(await app.discovery.hasHistory(g2)).toBe(false);

    await app.discovery.claimGuestViews("g1", "user-1");
    expect((await app.discovery.recentlyViewed({ userId: "user-1" })).map((p) => p.id)).toEqual([a.id, c.id, b.id]);
    expect(await app.discovery.hasHistory(g1)).toBe(false);
    await app.close();
  }, 120_000);

  it("T118: recommendations are deterministic, exclude what you are looking at, and favour the same type", async () => {
    const app = await createTestApp({ demoCatalog: true });
    const g1 = { guestToken: "g1" };
    const seedProduct = (await app.search.searchProducts({ sort: "featured", pageSize: 1 })).items[0];
    const full = await app.catalog.getProduct(seedProduct.slug);

    const first = await app.discovery.relatedTo(seedProduct.id, 6);
    const second = await app.discovery.relatedTo(seedProduct.id, 6);
    expect(first.map((p) => p.id)).toEqual(second.map((p) => p.id));
    expect(first.length).toBeGreaterThan(0);
    expect(first.some((p) => p.id === seedProduct.id)).toBe(false);
    const sameType = await Promise.all(first.slice(0, 3).map((p) => app.catalog.getProduct(p.slug)));
    expect(sameType.every((p) => p?.typeId === full?.typeId)).toBe(true);

    expect(await app.discovery.forYou(g1)).toEqual([]); // no history, nothing personal to say
    await app.discovery.recordView(g1, seedProduct.id);
    const personal = await app.discovery.forYou(g1, 6);
    expect(personal.map((p) => p.id)).toEqual(first.map((p) => p.id));
    await app.close();
  }, 120_000);
});
