import type { Cart } from "@/modules/cart";
import type { Quote } from "../types";
import { shippingFor, taxFor } from "./pricing-rules";

/**
 * Pure: prices a cart. No I/O.
 * First-party lines share the free-shipping rule on their own subtotal; each seller line adds the shipping
 * that seller charges. Tax is on the items.
 */
export function quoteCart(cart: Pick<Cart, "subtotalCents" | "lines">, discountCents: number = 0): Quote {
  const subtotalCents = cart.subtotalCents;
  const sellerLines = cart.lines.filter((l) => l.offerId !== null);
  const sellerSubtotal = sellerLines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const firstPartySubtotal = subtotalCents - sellerSubtotal;
  const shippingCents =
    (firstPartySubtotal > 0 ? shippingFor(firstPartySubtotal) : 0) + sellerLines.reduce((sum, l) => sum + l.shippingCents, 0);
  // A coupon reduces the items; tax is charged on what is left. Shipping rules look at the undiscounted items.
  const taxCents = taxFor(subtotalCents - discountCents);
  return { subtotalCents, discountCents, shippingCents, taxCents, totalCents: subtotalCents - discountCents + shippingCents + taxCents };
}
