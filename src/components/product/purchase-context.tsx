"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Cents } from "@/lib/money";
import type { AvailabilityState } from "@/modules/catalog";
import { dimensionsOf, nearestVariant, optionStates, type Dimension, type DimensionDef, type OptionState } from "@/modules/catalog/variants";
import { PriceBlock } from "./price-block";

type Image = { url: string; alt: string };

export type PurchaseVariant = {
  id: string;
  sku: string | null;
  label: string | null;
  selections: Record<string, string>;
  priceCents: Cents;
  listPriceCents: Cents | null;
  stock: number;
  state: AvailabilityState;
  images: Image[];
};

type Ctx = {
  variants: PurchaseVariant[];
  dimensions: Dimension[];
  states: Record<string, Record<string, OptionState>>;
  selected: PurchaseVariant;
  /** The shopper picked `value` for dimension `key`: move to the nearest real variant. */
  choose: (key: string, value: string) => void;
  /** Pictures for the selected variant, falling back to the product's. */
  images: Image[];
};

const PurchaseContext = createContext<Ctx | null>(null);

export function usePurchase(): Ctx {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return ctx;
}

type ProviderProps = {
  variants: PurchaseVariant[];
  /** The type's variation dimensions (labels and value order). */
  defs: DimensionDef[];
  productImages: Image[];
  /** The SKU from the URL, if any, so a shared link opens the same configuration. */
  initialSku?: string;
  children: ReactNode;
};

/**
 * Holds the selected variant so the price, availability, pictures and purchase form always describe the same
 * variant. Selection state is shared with the URL (`?sku=`) so a configuration survives refresh and sharing.
 */
export function PurchaseProvider({ variants, defs, productImages, initialSku, children }: ProviderProps) {
  const firstBuyable = variants.find((v) => v.stock > 0) ?? variants[0];
  const start = variants.find((v) => v.sku && v.sku === initialSku) ?? firstBuyable;
  const [selectedId, setSelectedId] = useState(start.id);
  const selected = variants.find((v) => v.id === selectedId) ?? firstBuyable;

  const dimensions = useMemo(() => dimensionsOf(variants, defs), [variants, defs]);
  const states = useMemo(() => optionStates(variants, selected.selections), [variants, selected.selections]);

  const choose = useCallback(
    (key: string, value: string) => {
      const next = nearestVariant(variants, selected.selections, { key, value });
      if (next) setSelectedId(next.id);
    },
    [variants, selected.selections],
  );

  useEffect(() => {
    if (variants.length < 2 || !selected.sku) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("sku") === selected.sku) return;
    url.searchParams.set("sku", selected.sku);
    window.history.replaceState(null, "", url);
  }, [selected.sku, variants.length]);

  const images = selected.images.length > 0 ? selected.images : productImages;
  return (
    <PurchaseContext.Provider value={{ variants, dimensions, states, selected, choose, images }}>{children}</PurchaseContext.Provider>
  );
}

/** Price for the selected variant (used where the purchase panel is not beside the title). */
export function LivePrice({ className }: { className?: string }) {
  const { selected } = usePurchase();
  return <PriceBlock cents={selected.priceCents} listCents={selected.listPriceCents} size="lg" className={className} />;
}
