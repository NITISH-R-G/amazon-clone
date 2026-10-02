import { availabilityState, type Catalog, type Category, type Product } from "@/modules/catalog";
import type { CategoryFacet, ProductSummary, SearchQuery, SearchResult, Suggestion } from "../types";

export const DEFAULT_PAGE_SIZE = 12;

export type SearchDeps = { catalog: Pick<Catalog, "listProducts" | "listCategories"> };

function summarise(product: Product, categoryName: string | null): ProductSummary {
  const cheapest = product.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a), product.variants[0]);
  const stock = product.variants.reduce((n, v) => n + v.stock, 0);
  const image = product.images[0];
  const purchasable = product.variants.length === 1 && product.variants[0].stock > 0;
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    imageUrl: image?.url ?? null,
    imageAlt: image?.alt ?? product.title,
    priceCents: cheapest?.priceCents ?? 0,
    listPriceCents:
      cheapest?.listPriceCents && cheapest.listPriceCents > cheapest.priceCents ? cheapest.listPriceCents : null,
    rating: product.rating,
    ratingCount: product.ratingCount,
    availability: availabilityState(stock),
    categoryName,
    singleVariantId: purchasable ? product.variants[0].id : null,
  };
}

const byTitle = (a: Product, b: Product) => a.title.localeCompare(b.title);
const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.priceCents));

const sorters: Record<SearchQuery["sort"], (a: Product, b: Product) => number> = {
  featured: (a, b) =>
    (a.featuredRank ?? Number.MAX_SAFE_INTEGER) - (b.featuredRank ?? Number.MAX_SAFE_INTEGER) || byTitle(a, b),
  "price-asc": (a, b) => minPrice(a) - minPrice(b) || byTitle(a, b),
  "price-desc": (a, b) => minPrice(b) - minPrice(a) || byTitle(a, b),
  rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount || byTitle(a, b),
  newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || byTitle(a, b),
};

export function createSearch({ catalog }: SearchDeps) {
  async function load() {
    const [products, categories] = await Promise.all([catalog.listProducts(), catalog.listCategories()]);
    const byId = new Map(categories.map((c) => [c.id, c]));
    return { products, categories, byId };
  }

  function matches(p: Product, q: SearchQuery, category: Category | undefined, ignoreCategory = false): boolean {
    if (q.text) {
      const haystack = `${p.title} ${p.brand} ${category?.name ?? ""} ${p.description}`.toLowerCase();
      if (!q.text.toLowerCase().split(/\s+/).every((t) => haystack.includes(t))) return false;
    }
    if (!ignoreCategory && q.categorySlug && category?.slug !== q.categorySlug) return false;
    const price = minPrice(p);
    if (q.minPriceCents !== undefined && price < q.minPriceCents) return false;
    if (q.maxPriceCents !== undefined && price > q.maxPriceCents) return false;
    if (q.minRating !== undefined && p.rating < q.minRating) return false;
    if (q.inStockOnly && !p.variants.some((v) => v.stock > 0)) return false;
    if (q.onSale && !p.variants.some((v) => v.listPriceCents !== null && v.listPriceCents > v.priceCents)) return false;
    return true;
  }

  /** `sort` and `page` are optional here; callers parsing a URL always get them from `parseSearchParams`. */
  async function searchProducts(input: Partial<SearchQuery>): Promise<SearchResult> {
    const query: SearchQuery = { ...input, sort: input.sort ?? "featured", page: input.page ?? 1 };
    const { products, categories, byId } = await load();
    const catOf = (p: Product) => (p.categoryId ? byId.get(p.categoryId) : undefined);

    const matched = products.filter((p) => matches(p, query, catOf(p))).sort(sorters[query.sort]);

    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
    const page = Math.min(Math.max(1, query.page), pageCount);
    const items = matched
      .slice((page - 1) * pageSize, page * pageSize)
      .map((p) => summarise(p, catOf(p)?.name ?? null));

    const withoutCategory = products.filter((p) => matches(p, query, catOf(p), true));
    const facetCategories: CategoryFacet[] = categories
      .map((c) => ({ slug: c.slug, name: c.name, count: withoutCategory.filter((p) => p.categoryId === c.id).length }))
      .filter((f) => f.count > 0);

    return { items, total: matched.length, page, pageCount, pageSize, facets: { categories: facetCategories } };
  }

  /** Short list for the search box: product titles first (title prefix, then any word prefix), then categories. */
  async function suggest(text: string, limit = 8): Promise<Suggestion[]> {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const { products, categories } = await load();
    const startsWithWord = (label: string) => label.toLowerCase().split(/\s+/).some((w) => w.startsWith(q));
    const titleStarts = products.filter((p) => p.title.toLowerCase().startsWith(q));
    const wordStarts = products.filter((p) => !p.title.toLowerCase().startsWith(q) && startsWithWord(p.title));
    const productHits: Suggestion[] = [...titleStarts.sort(byTitle), ...wordStarts.sort(byTitle)].map((p) => ({
      type: "product",
      label: p.title,
      slug: p.slug,
    }));
    const categoryHits: Suggestion[] = categories
      .filter((c) => startsWithWord(c.name))
      .map((c) => ({ type: "category", label: c.name, slug: c.slug }));
    return [...productHits, ...categoryHits].slice(0, limit);
  }

  return { searchProducts, suggest };
}

export type Search = ReturnType<typeof createSearch>;
