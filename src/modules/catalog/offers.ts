// Pure offer logic (no database). Importable from client components as "@/modules/catalog/offers".
// Every variant has an implicit first-party offer (the variant's own price and stock); sellers add more.

import type { Cents } from "@/lib/money";
import type { AvailabilityState } from "./types";

export type Fulfilment = "cartly" | "seller";

export type OfferView = {
  /** Null for the first-party offer (the variant itself). */
  offerId: string | null;
  sellerName: string;
  fulfilment: Fulfilment;
  priceCents: Cents;
  listPriceCents: Cents | null;
  /** Shipping for this offer (first-party offers carry the shipping the caller computed for them). */
  shippingCents: Cents;
  /** Minutes before the seller ships (first-party: 0). Pushes the whole delivery timeline back. */
  handlingMinutes: number;
  stock: number;
};

const landed = (o: OfferView) => o.priceCents + o.shippingCents;

/**
 * The buy box (our rule, not Amazon's proprietary one). Among in-stock offers:
 *  1. find the lowest landed price (price plus shipping);
 *  2. every offer within 2% of it is a contender;
 *  3. among contenders prefer Cartly-fulfilled over seller-fulfilled, then the first-party offer, then the shorter
 *     handling time, then the lower landed price, then the offer id (so the result never depends on input order).
 * If nothing is in stock the first-party offer is returned (the page then reads "out of stock").
 * The first offer in the list is the first-party offer.
 */
export const BUY_BOX_TOLERANCE = 0.02;

export function bestOffer(offers: OfferView[]): OfferView {
  const [firstParty] = offers;
  const buyable = offers.filter((o) => o.stock > 0);
  if (buyable.length === 0) return firstParty;
  const lowest = Math.min(...buyable.map(landed));
  const contenders = buyable.filter((o) => landed(o) <= lowest * (1 + BUY_BOX_TOLERANCE));
  const rank = (o: OfferView): [number, number, number, number, string] => [
    o.fulfilment === "cartly" ? 0 : 1,
    o === firstParty ? 0 : 1,
    o.handlingMinutes,
    landed(o),
    o.offerId ?? "",
  ];
  return contenders.reduce((best, o) => {
    const a = rank(o);
    const b = rank(best);
    for (let i = 0; i < a.length; i++) {
      if (a[i] < b[i]) return o;
      if (a[i] > b[i]) return best;
    }
    return best;
  });
}

/** Out of stock at 0, low stock from 1 to 5, otherwise in stock. */
export function availabilityState(stock: number): AvailabilityState {
  if (stock <= 0) return "out_of_stock";
  return stock <= 5 ? "low_stock" : "in_stock";
}
