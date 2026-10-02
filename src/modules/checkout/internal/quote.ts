import type { Cart } from "@/modules/cart";
import type { Quote } from "../types";
import { shippingFor, taxFor } from "./pricing-rules";

/**
 * Pure: prices a cart. No I/O.
 * First-party lines share the free-shipping rule on their own subtotal; each seller line adds the shipping
 * that seller charges. Tax is on the items.
 */
export function quoteCart(cart: Pick<Cart, "subtotalCents" | "lines">): Quote {
  const subtotalCents = cart.subtotalCents;
  const sellerLines = cart.lines.filter((l) => l.offerId !== null);
  const sellerSubtotal = sellerLines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const firstPartySubtotal = subtotalCents - sellerSubtotal;
  const shippingCents =
    (firstPartySubtotal > 0 ? shippingFor(firstPartySubtotal) : 0) + sellerLines.reduce((sum, l) => sum + l.shippingCents, 0);
  const taxCents = taxFor(subtotalCents);
  return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents };
}
