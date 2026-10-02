import type { Cents } from "@/lib/money";
import type { AvailabilityState } from "@/modules/catalog";

export type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "newest";

export const SORT_KEYS: readonly SortKey[] = ["featured", "price-asc", "price-desc", "rating", "newest"];

export type SearchQuery = {
  text?: string;
  categorySlug?: string;
  minPriceCents?: Cents;
  maxPriceCents?: Cents;
  minRating?: number;
  inStockOnly?: boolean;
  onSale?: boolean;
  sort: SortKey;
  page: number;
  pageSize?: number;
};

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  imageUrl: string | null;
  imageAlt: string;
  priceCents: Cents;
  /** Original price when the cheapest variant is on sale. */
  listPriceCents: Cents | null;
  rating: number;
  ratingCount: number;
  availability: AvailabilityState;
  categoryName: string | null;
  /** Set when the product has exactly one purchasable variant (eligible for quick add). */
  singleVariantId: string | null;
};

export type CategoryFacet = { slug: string; name: string; count: number };

export type SearchResult = {
  items: ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  facets: { categories: CategoryFacet[] };
};

export type Suggestion = { type: "product" | "category"; label: string; slug: string };
