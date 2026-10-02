"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Cents } from "@/lib/money";
import type { AvailabilityState } from "@/modules/catalog";
import { PriceBlock } from "./price-block";

export type PurchaseVariant = {
  id: string;
  label: string | null;
  priceCents: Cents;
  listPriceCents: Cents | null;
  stock: number;
  state: AvailabilityState;
};

type Ctx = {
  variants: PurchaseVariant[];
  selected: PurchaseVariant;
  select: (id: string) => void;
};

const PurchaseContext = createContext<Ctx | null>(null);

export function usePurchase(): Ctx {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return ctx;
}

/** Holds the selected variant so the price in the product information and the purchase panel stay in sync. */
export function PurchaseProvider({ variants, children }: { variants: PurchaseVariant[]; children: ReactNode }) {
  const firstBuyable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstBuyable.id);
  const selected = variants.find((v) => v.id === selectedId) ?? firstBuyable;
  return <PurchaseContext.Provider value={{ variants, selected, select: setSelectedId }}>{children}</PurchaseContext.Provider>;
}

/** Price for the selected variant (used where the purchase panel is not beside the title). */
export function LivePrice({ className }: { className?: string }) {
  const { selected } = usePurchase();
  return <PriceBlock cents={selected.priceCents} listCents={selected.listPriceCents} size="lg" className={className} />;
}
