import { and, desc, eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import type { Clock } from "@/lib/ports";
import { actorKey, type Actor } from "@/lib/result";
import type { Catalog, Product } from "@/modules/catalog";
import type { ProductSummary, Search } from "@/modules/search";
import { productViews } from "../schema";
import { rank, type Candidate, type Signals } from "../score";

export type DiscoveryDeps = {
  db: DbOrTx;
  clock: Clock;
  catalog: Pick<Catalog, "findProducts" | "listCategories" | "listTypes">;
  search: Pick<Search, "searchProducts">;
};

const MAX_RECENT = 20;
const POOL = 24;

const cheapest = (p: Product) => p.variants.reduce((m, v) => Math.min(m, v.priceCents), Number.POSITIVE_INFINITY);
const signalsOf = (p: Product): Signals => ({
  id: p.id,
  typeId: p.typeId,
  categoryId: p.categoryId,
  brand: p.brand,
  priceCents: Number.isFinite(cheapest(p)) ? cheapest(p) : 0,
  attributes: p.attributes,
});
const candidateOf = (p: Product): Candidate => ({
  ...signalsOf(p),
  rating: p.rating,
  ratingCount: p.ratingCount,
  onSale: p.variants.some((v) => v.listPriceCents !== null && v.listPriceCents > v.priceCents),
  inStock: p.variants.some((v) => v.stock > 0),
});

export function createDiscovery({ db, clock, catalog, search }: DiscoveryDeps) {
  /** Notes that the actor looked at a product (idempotent per product: a repeat view refreshes the time). */
  async function recordView(actor: Actor, productId: string): Promise<void> {
    await db
      .insert(productViews)
      .values({ ownerKey: actorKey(actor), productId, viewedAt: clock.now() })
      .onConflictDoUpdate({
        target: [productViews.ownerKey, productViews.productId],
        set: { viewedAt: clock.now(), views: sql`${productViews.views} + 1` },
      });
  }

  async function recentIds(actor: Actor, limit: number, excludeProductId?: string): Promise<string[]> {
    const rows = await db
      .select({ id: productViews.productId })
      .from(productViews)
      .where(eq(productViews.ownerKey, actorKey(actor)))
      .orderBy(desc(productViews.viewedAt), desc(productViews.productId))
      .limit(Math.min(limit, MAX_RECENT) + 1);
    return rows.map((r) => r.id).filter((id) => id !== excludeProductId).slice(0, limit);
  }

  /** Summaries for ids, in the given order (products that no longer exist are dropped). */
  async function summaries(ids: string[]): Promise<ProductSummary[]> {
    if (ids.length === 0) return [];
    const found = await search.searchProducts({ ids, sort: "featured", pageSize: ids.length });
    const byId = new Map(found.items.map((p) => [p.id, p]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  /** The actor's recently viewed products, newest first. */
  async function recentlyViewed(actor: Actor | null, limit = 8, excludeProductId?: string): Promise<ProductSummary[]> {
    if (!actor) return [];
    return summaries(await recentIds(actor, limit, excludeProductId));
  }

  /** Candidate pool around the seeds: the best-rated products of each seed's type and category. */
  async function pool(seeds: Product[]): Promise<Product[]> {
    const [types, categories] = await Promise.all([catalog.listTypes(), catalog.listCategories()]);
    const typeSlug = new Map(types.map((t) => [t.id, t.slug]));
    const categorySlug = new Map(categories.map((c) => [c.id, c.slug]));
    const queries = new Map<string, { typeSlug?: string; categorySlug?: string }>();
    for (const s of seeds) {
      const t = s.typeId ? typeSlug.get(s.typeId) : undefined;
      const c = s.categoryId ? categorySlug.get(s.categoryId) : undefined;
      if (t) queries.set(`t:${t}`, { typeSlug: t });
      if (c) queries.set(`c:${c}`, { categorySlug: c });
    }
    const pages = await Promise.all(
      [...queries.values()].map((q) => catalog.findProducts({ ...q, sort: "rating", page: 1, pageSize: POOL, withFacets: false })),
    );
    const byId = new Map<string, Product>();
    for (const page of pages) for (const p of page.products) byId.set(p.id, p);
    return [...byId.values()];
  }

  async function recommend(seeds: Product[], limit: number): Promise<ProductSummary[]> {
    if (seeds.length === 0) return [];
    const ranked = rank(seeds.map(signalsOf), (await pool(seeds)).map(candidateOf), limit);
    return summaries(ranked.map((c) => c.id));
  }

  async function productsById(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const page = await catalog.findProducts({ ids, sort: "featured", page: 1, pageSize: ids.length, withFacets: false });
    const byId = new Map(page.products.map((p) => [p.id, p]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  /** "Related products" for a product page: similar products, best match first. */
  async function relatedTo(productId: string, limit = 6): Promise<ProductSummary[]> {
    return recommend(await productsById([productId]), limit);
  }

  /** "Based on your recent views": the actor's last few products drive the ranking (the most recent counts most). */
  async function forYou(actor: Actor | null, limit = 8): Promise<ProductSummary[]> {
    if (!actor) return [];
    return recommend(await productsById(await recentIds(actor, 3)), limit);
  }

  async function hasHistory(actor: Actor | null): Promise<boolean> {
    if (!actor) return false;
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(productViews)
      .where(and(eq(productViews.ownerKey, actorKey(actor))));
    return (row?.n ?? 0) > 0;
  }

  /** After sign-in: what a guest looked at joins the account's history. */
  async function claimGuestViews(guestToken: string, userId: string): Promise<void> {
    await db.execute(sql`
      insert into product_views (owner_key, product_id, viewed_at, views)
      select ${actorKey({ userId })}, product_id, viewed_at, views from product_views where owner_key = ${actorKey({ guestToken })}
      on conflict (owner_key, product_id) do update set viewed_at = greatest(product_views.viewed_at, excluded.viewed_at), views = product_views.views + excluded.views`);
    await db.delete(productViews).where(eq(productViews.ownerKey, actorKey({ guestToken })));
  }

  return { recordView, recentlyViewed, relatedTo, forYou, hasHistory, claimGuestViews };
}

export type Discovery = ReturnType<typeof createDiscovery>;
