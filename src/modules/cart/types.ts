import type { Cents } from "@/lib/money";

export type CartLine = {
  id: string;
  variantId: string;
  title: string;
  imageUrl: string | null;
  unitPriceCents: Cents;
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
