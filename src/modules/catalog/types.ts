import type { Cents } from "@/lib/money";
import type { ProductImage, ProductSpec } from "./schema";

export type { ProductImage, ProductSpec };

export type Variant = {
  id: string;
  productId: string;
  label: string | null;
  sku: string | null;
  selections: Record<string, string>;
  images: ProductImage[];
  priceCents: Cents;
  listPriceCents: Cents | null;
  stock: number;
};

export type Category = { id: string; slug: string; name: string; position: number };

export type AvailabilityState = "in_stock" | "low_stock" | "out_of_stock";

export type Product = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  description: string;
  images: ProductImage[];
  variants: Variant[];
  categoryId: string | null;
  /** Average rating with one decimal (display value; stored as tenths). */
  rating: number;
  ratingCount: number;
  featuredRank: number | null;
  createdAt: Date;
  bullets: string[];
  typeId: string | null;
  attributes: Record<string, string>;
  specs: ProductSpec[];
  optionName: string | null;
};

/** A variant with the product context a cart or order line needs. */
export type VariantDetail = Variant & {
  productSlug: string;
  title: string;
  imageUrl: string | null;
};

export type ProductSort = "relevance" | "featured" | "price-asc" | "price-desc" | "rating" | "newest";

/**
 * Text to match. `tokens` are lower-case letters and digits only (the caller normalises).
 * `all`: every word is the start of a word in the product (or of its category name);
 * `fuzzy`: like `all`, but a word may also be a close misspelling of a title or brand word;
 * `partial`: as `all` (no misspellings), but only half of the words (rounded up) have to match.
 */
export type TextMatch = { tokens: string[]; mode: "all" | "fuzzy" | "partial"; includeCategoryName?: boolean };

export type ProductCriteria = {
  text?: TextMatch;
  categorySlug?: string;
  brands?: string[];
  minPriceCents?: Cents;
  maxPriceCents?: Cents;
  minRating?: number;
  inStockOnly?: boolean;
  onSale?: boolean;
  sort: ProductSort;
  /** 1-based; clamped to the last page. */
  page: number;
  pageSize: number;
  /** Default true. Probing queries that only need to know whether anything matches can skip the facet counts. */
  withFacets?: boolean;
};

export type CategoryCount = { slug: string; name: string; count: number };
export type BrandCount = { name: string; count: number };

export type ProductPage = {
  products: Product[];
  total: number;
  /** The page actually returned (after clamping). */
  page: number;
  /** Counts that ignore their own filter, so a facet shows what choosing it would give. */
  facets: { categories: CategoryCount[]; brands: BrandCount[] };
};

export type AttributeDef = {
  key: string;
  label: string;
  role: "variation" | "spec";
  facet: boolean;
  /** Ordered vocabulary; empty means free text. */
  values: string[];
};

export type ProductType = { id: string; slug: string; name: string; categoryId: string; attributes: AttributeDef[] };
