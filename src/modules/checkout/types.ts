import type { Cents } from "@/lib/money";

export type Quote = {
  subtotalCents: Cents;
  shippingCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
};

export type CheckoutError = "EMPTY_CART" | "OUT_OF_STOCK" | "PAYMENT_DECLINED" | "INVALID_ADDRESS";
