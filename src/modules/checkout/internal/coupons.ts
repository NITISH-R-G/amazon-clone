import type { Cents } from "@/lib/money";

export type Promotion = {
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  minSubtotalCents: Cents;
  startsAt: Date;
  endsAt: Date;
};

export type CouponError = "UNKNOWN_CODE" | "NOT_STARTED" | "EXPIRED" | "MIN_SPEND";

export type AppliedCoupon = { code: string; label: string; discountCents: Cents };

export const normaliseCode = (code: string) => code.trim().toUpperCase();

/**
 * Pure: what a coupon takes off a subtotal. A discount never exceeds the subtotal, percent discounts round down,
 * and the code is matched case-insensitively. Minimum spend is checked on the subtotal before the discount.
 */
export function applyCoupon(
  promotion: Promotion | null,
  subtotalCents: Cents,
  now: Date,
): { ok: true; coupon: AppliedCoupon } | { ok: false; error: CouponError; minSubtotalCents?: Cents } {
  if (!promotion) return { ok: false, error: "UNKNOWN_CODE" };
  if (now < promotion.startsAt) return { ok: false, error: "NOT_STARTED" };
  if (now >= promotion.endsAt) return { ok: false, error: "EXPIRED" };
  if (subtotalCents < promotion.minSubtotalCents) return { ok: false, error: "MIN_SPEND", minSubtotalCents: promotion.minSubtotalCents };
  const raw = promotion.kind === "percent" ? Math.floor((subtotalCents * promotion.value) / 100) : promotion.value;
  return { ok: true, coupon: { code: promotion.code, label: promotion.label, discountCents: Math.min(Math.max(raw, 0), subtotalCents) } };
}

export const couponMessages: Record<CouponError, (min?: Cents) => string> = {
  UNKNOWN_CODE: () => "That code is not valid.",
  NOT_STARTED: () => "That code is not active yet.",
  EXPIRED: () => "That code has expired.",
  MIN_SPEND: (min) => (min ? `Spend at least $${(min / 100).toFixed(2)} on items to use this code.` : "Your items do not reach the minimum spend for this code."),
};
