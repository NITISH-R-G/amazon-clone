import type { Cents } from "@/lib/money";

export type Quote = {
  subtotalCents: Cents;
  /** Taken off the items by a coupon (0 when none). */
  discountCents: Cents;
  shippingCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
};

export type { AppliedCoupon, CouponError } from "./internal/coupons";

import type { CouponError } from "./internal/coupons";

export type CheckoutError = "EMPTY_CART" | "OUT_OF_STOCK" | "PAYMENT_DECLINED" | "INVALID_ADDRESS" | CouponError;
