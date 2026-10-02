import type { Cart } from "@/modules/cart";
import type { Quote } from "../types";
import { shippingFor, taxFor } from "./pricing-rules";

/** Pure: prices a cart. No I/O. */
export function quoteCart(cart: Pick<Cart, "subtotalCents">): Quote {
  const subtotalCents = cart.subtotalCents;
  const shippingCents = shippingFor(subtotalCents);
  const taxCents = taxFor(subtotalCents);
  return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents };
}
