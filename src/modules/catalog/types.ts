import type { Cents } from "@/lib/money";
import type { ProductImage, ProductSpec } from "./schema";

export type { ProductImage, ProductSpec };

export type Variant = {
  id: string;
  productId: string;
  label: string | null;
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
  specs: ProductSpec[];
  optionName: string | null;
};

/** A variant with the product context a cart or order line needs. */
export type VariantDetail = Variant & {
  productSlug: string;
  title: string;
  imageUrl: string | null;
};
