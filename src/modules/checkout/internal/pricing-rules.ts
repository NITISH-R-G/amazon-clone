import type { Cents } from "@/lib/money";

// PROVISIONAL demo rules (ours, not Amazon's): UNKNOWN / REQUIRES VALIDATION
// against the checkout capture. Isolated here so they are trivial to change.
export const FREE_SHIPPING_THRESHOLD_CENTS: Cents = 3500;
export const FLAT_SHIPPING_CENTS: Cents = 499;
export const TAX_RATE_BASIS_POINTS = 800; // 8.00%

export function shippingFor(subtotalCents: Cents): Cents {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}

/** Integer arithmetic only; rounds half up. */
export function taxFor(subtotalCents: Cents): Cents {
  return Math.floor((subtotalCents * TAX_RATE_BASIS_POINTS + 5000) / 10_000);
}
