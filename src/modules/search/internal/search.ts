import {
  availabilityState,
  type Catalog,
  type Product,
  type ProductCriteria,
  type ProductPage,
  type ProductSort,
  type TextMatch,
} from "@/modules/catalog";
import type { ProductSummary, SearchQuery, SearchResult, Suggestion } from "../types";
import { fuse, interpretQuery, WEIGHTS_EXACT, WEIGHTS_MEANING, withFallback } from "./semantic";

export const DEFAULT_PAGE_SIZE = 12;

export type SearchDeps = { catalog: Pick<Catalog, "findProducts" | "listCategories"> };

// Very common words carry no meaning for finding a product and match descriptions by accident.
const FILLER = new Set(
  (
    "a an and or the of for with in to on at by as is are was were be been it its this that these those " +
    "do does did not no so but if any all from your you my we i have has had can will just"
  ).split(" "),
);
const wordsOf = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** The words that carry meaning; if the query is only filler, keep it as typed. Bounded so a huge query stays cheap. */
function queryTokens(text: string): string[] {
  const all = wordsOf(text);
  const meaningful = all.filter((w) => !FILLER.has(w));
  return (meaningful.length > 0 ? meaningful : all).slice(0, 8).map((w) => w.slice(0, 32));
}

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

const EMPTY_FACETS = { categories: [], brands: [], types: [], attributes: [] };

export function createSearch({ catalog }: SearchDeps) {
  /**
   * Try progressively looser readings of the text and stop at the first that finds anything:
   * every word as a word-start; then the same allowing close misspellings; then half of the words.
   */
  async function run(query: SearchQuery, base: Omit<ProductCriteria, "text">, tokens: string[]) {
    if (tokens.length === 0) return { found: await catalog.findProducts(base), relaxed: false };
    const modes: TextMatch["mode"][] = tokens.length > 1 ? ["all", "fuzzy", "partial"] : ["all", "fuzzy"];
    let last: ProductPage | null = null;
    for (const [i, mode] of modes.entries()) {
      // Looser readings only probe (no facet counts) until one of them finds something.
      const probing = i > 0;
      last = await catalog.findProducts({ ...base, text: { tokens, mode }, withFacets: !probing });
      if (last.total > 0) {
        if (probing) last = await catalog.findProducts({ ...base, text: { tokens, mode } });
        return { found: last, relaxed: mode === "partial" };
      }
    }
    return { found: last as ProductPage, relaxed: false };
  }

  /** `sort` and `page` are optional here; callers parsing a URL always get them from `parseSearchParams`. */
  async function searchProducts(input: Partial<SearchQuery>): Promise<SearchResult> {
    const query: SearchQuery = { ...input, sort: input.sort ?? "featured", page: input.page ?? 1 };
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const hasText = Boolean(query.text);
    const tokens = hasText ? queryTokens(query.text as string) : [];
    if (hasText && tokens.length === 0) {
      // Only symbols (for example "%" or "!!!"): nothing can match, and it must not match everything.
      return { items: [], total: 0, page: 1, pageCount: 1, pageSize, relaxed: false, facets: EMPTY_FACETS };
    }

    const sort: ProductSort = query.sort === "featured" && tokens.length > 0 ? "relevance" : query.sort;
    const baseCriteria: Omit<ProductCriteria, "text"> = {
        ids: query.ids,
        categorySlug: query.categorySlug,
        typeSlug: query.typeSlug,
        attributes: query.attributes,
        brands: query.brands,
        minPriceCents: query.minPriceCents,
        maxPriceCents: query.maxPriceCents,
        minRating: query.minRating,
        inStockOnly: query.inStockOnly,
        onSale: query.onSale,
        sort,
        page: query.page,
        pageSize,
    };
    const { found, relaxed } = await run(query, baseCriteria, tokens);

    const categories = await catalog.listCategories();
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    const summarised = found.products.map((p) => summarise(p, p.categoryId ? (nameById.get(p.categoryId) ?? null) : null));

    // Hybrid step: meaning-based candidates join the lexical ones when the words alone found little (or only a partial
    // match). Any failure here falls back to the plain lexical result.
    if (hasText && query.page === 1 && !query.typeSlug && !query.ids && sort === "relevance" && (relaxed || found.total < pageSize)) {
      const hybrid = await withFallback<SearchResult | null>(async () => {
        const intent = interpretQuery(query.text as string);
        if (!intent) return null;
        const pages = await Promise.all(
          intent.types.map((typeSlug, i) =>
            catalog.findProducts({ ...baseCriteria, typeSlug, sort: "rating", page: 1, pageSize: 6, withFacets: found.total === 0 && i === 0 }),
          ),
        );
        const semantic = pages.flatMap((pg) => pg.products).map((p) => summarise(p, p.categoryId ? (nameById.get(p.categoryId) ?? null) : null));
        const lexicalIds = new Set(summarised.map((p) => p.id));
        const added = semantic.filter((p) => !lexicalIds.has(p.id));
        if (added.length === 0) return null;
        const meaningLed = relaxed || found.total === 0;
        const merged = fuse(summarised, semantic, meaningLed ? WEIGHTS_MEANING : WEIGHTS_EXACT)
          .slice(0, pageSize)
          .map((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== "hybridScore")) as ProductSummary);
        return {
          items: merged,
          total: Math.max(found.total, merged.length),
          page: 1,
          pageCount: found.total > pageSize ? Math.ceil(found.total / pageSize) : 1,
          pageSize,
          relaxed: false,
          facets: found.total === 0 ? pages[0].facets : found.facets,
          semantic: { meaning: intent.concepts.map((c) => c.label), addedCount: added.length },
        };
      }, null);
      if (hybrid) return hybrid;
    }

    return {
      items: summarised,
      total: found.total,
      page: found.page,
      pageCount: Math.max(1, Math.ceil(found.total / pageSize)),
      pageSize,
      relaxed,
      facets: found.facets,
    };
  }

  /** Short list for the search box: products whose words start with the text, then matching categories. */
  async function suggest(text: string, limit = 8): Promise<Suggestion[]> {
    const tokens = queryTokens(text.trim());
    if (tokens.length === 0) return [];
    const [found, categories] = await Promise.all([
      catalog.findProducts({
        text: { tokens, mode: "all", includeCategoryName: false },
        sort: "relevance",
        page: 1,
        pageSize: limit,
      }),
      catalog.listCategories(),
    ]);
    const q = text.trim().toLowerCase();
    const startsWithWord = (label: string) => label.toLowerCase().split(/\s+/).some((w) => w.startsWith(q));
    const productHits: Suggestion[] = found.products.map((p) => ({ type: "product", label: p.title, slug: p.slug }));
    const categoryHits: Suggestion[] = categories
      .filter((c) => startsWithWord(c.name))
      .map((c) => ({ type: "category", label: c.name, slug: c.slug }));
    return [...productHits, ...categoryHits].slice(0, limit);
  }

  return { searchProducts, suggest };
}

export type Search = ReturnType<typeof createSearch>;
