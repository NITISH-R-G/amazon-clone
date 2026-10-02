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

const FILLER = new Set(["a", "an", "and", "or", "the", "of", "for", "with", "in", "to"]);
const wordsOf = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** The words that carry meaning; if the query is only filler, keep it as typed. */
function queryTokens(text: string): string[] {
  const all = wordsOf(text);
  const meaningful = all.filter((w) => !FILLER.has(w));
  return meaningful.length > 0 ? meaningful : all;
}

/** True when `a` and `b` differ by at most `max` insertions, deletions or substitutions. */
function withinEdits(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length] <= max;
}

/** Substring match, or (for words of 4+ letters) a close spelling of a word in the product text. */
function tokenMatches(token: string, haystack: string, haystackWords: string[]): boolean {
  if (haystack.includes(token)) return true;
  if (token.length < 4) return false;
  const allowed = token.length >= 8 ? 2 : 1;
  return haystackWords.some((w) => withinEdits(token, w, allowed));
}

/** `any` means at least half of the words (rounded up): one stray match is coincidence, not relevance. */
type TextMode = "all" | "any";

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

  function matches(
    p: Product,
    q: SearchQuery,
    category: Category | undefined,
    mode: TextMode,
    ignoreCategory = false,
  ): boolean {
    const tokens = q.text ? queryTokens(q.text) : [];
    if (tokens.length > 0) {
      const haystack = `${p.title} ${p.brand} ${category?.name ?? ""} ${p.description}`.toLowerCase();
      const words = wordsOf(haystack);
      const hits = tokens.filter((t) => tokenMatches(t, haystack, words)).length;
      if (hits < (mode === "all" ? tokens.length : Math.ceil(tokens.length / 2))) return false;
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

    const tokenCount = query.text ? queryTokens(query.text).length : 0;
    let mode: TextMode = "all";
    let matched = products.filter((p) => matches(p, query, catOf(p), mode));
    // Nothing has every word: show products with some of them, and say so.
    if (matched.length === 0 && tokenCount >= 2) {
      const partial = products.filter((p) => matches(p, query, catOf(p), "any"));
      if (partial.length > 0) {
        mode = "any";
        matched = partial;
      }
    }
    matched = matched.sort(sorters[query.sort]);

    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
    const page = Math.min(Math.max(1, query.page), pageCount);
    const items = matched
      .slice((page - 1) * pageSize, page * pageSize)
      .map((p) => summarise(p, catOf(p)?.name ?? null));

    const withoutCategory = products.filter((p) => matches(p, query, catOf(p), mode, true));
    const facetCategories: CategoryFacet[] = categories
      .map((c) => ({ slug: c.slug, name: c.name, count: withoutCategory.filter((p) => p.categoryId === c.id).length }))
      .filter((f) => f.count > 0);

    return {
      items,
      total: matched.length,
      page,
      pageCount,
      pageSize,
      relaxed: mode === "any",
      facets: { categories: facetCategories },
    };
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
