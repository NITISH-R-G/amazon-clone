import type { Cents } from "@/lib/money";

export type CartLine = {
  id: string;
  variantId: string;
  /** Stock-keeping unit and the options chosen ("Black, 256 GB, 8 GB"): the identity of what was selected. */
  sku: string | null;
  variantLabel: string | null;
  productSlug: string;
  title: string;
  imageUrl: string | null;
  unitPriceCents: Cents;
  /** Original price when the variant is on sale, otherwise null. */
  listPriceCents: Cents | null;
  quantity: number;
  lineTotalCents: Cents;
  /** True when the variant can currently be bought in this quantity. */
  available: boolean;
  /** Set on the result of an add/update when the quantity was reduced to stock. */
  clamped?: boolean;
};

export type Cart = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: Cents;
};

export type CartError = "VARIANT_NOT_FOUND" | "LINE_NOT_FOUND" | "INVALID_QUANTITY" | "OUT_OF_STOCK";
