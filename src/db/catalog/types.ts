import type { Department } from "./product-types";

export type { Department };

export type AttrRole = "variation" | "spec";

/** One attribute of a product type. `values` is the ordered vocabulary; empty means free text (a model code). */
export type AttrDef = { key: string; label: string; role: AttrRole; facet: boolean; values: string[] };

/**
 * A product type as the generator and the database both see it. Heterogeneous by design: a smartphone and a
 * sofa share no attributes, and adding a type adds data, not tables or UI code.
 */
export type TypeDef = {
  slug: string;
  name: string;
  category: Department;
  /** Illustration drawn by scripts/generate-product-art.mjs. */
  shape: string;
  noun: string;
  mods: string[];
  sizes?: string[];
  /** Dollar range for the base price. */
  price: [number, number];
  attrs: AttrDef[];
  features: string[];
  blurbs: string[];
  uses: string[];
  /** Dollars added to the base price per variation value, e.g. { storage: { "512 GB": 210 } }. */
  deltas?: Record<string, Record<string, number>>;
  /** Which combinations of variation values exist (a phone with 8 GB RAM does not come in 1 TB). */
  allowed?: (selection: Record<string, string>) => boolean;
  /** Share of products of this type that have several variants (legacy types); rich types always do. */
  variantShare?: number;
};
