import type { Cents } from "@/lib/money";
import type { ProductImage } from "./schema";

export type { ProductImage };

export type Variant = {
  id: string;
  productId: string;
  label: string | null;
  priceCents: Cents;
  listPriceCents: Cents | null;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  description: string;
  images: ProductImage[];
  variants: Variant[];
};

/** A variant with the product context a cart or order line needs. */
export type VariantDetail = Variant & {
  productSlug: string;
  title: string;
  imageUrl: string | null;
};
