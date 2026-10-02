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
 * The buy box: the in-stock offer with the lowest landed price (price plus shipping). A tie goes to the first-party
 * offer; if nothing is in stock the first-party offer is returned (the page then reads "out of stock").
 * The first offer in the list is the first-party offer.
 */
export function bestOffer(offers: OfferView[]): OfferView {
  const [firstParty, ...others] = offers;
  const buyable = [firstParty, ...others].filter((o) => o.stock > 0);
  if (buyable.length === 0) return firstParty;
  return buyable.reduce((best, o) => (landed(o) < landed(best) ? o : best));
}

/** Out of stock at 0, low stock from 1 to 5, otherwise in stock. */
export function availabilityState(stock: number): AvailabilityState {
  if (stock <= 0) return "out_of_stock";
  return stock <= 5 ? "low_stock" : "in_stock";
}
