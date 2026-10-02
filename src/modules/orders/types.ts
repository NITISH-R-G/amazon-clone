import type { Cents } from "@/lib/money";
import type { Actor } from "@/lib/result";

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type OrderItem = {
  variantId: string;
  title: string;
  unitPriceCents: Cents;
  quantity: number;
  imageUrl: string | null;
  sku: string | null;
  variantLabel: string | null;
  /** Who sold it ("Cartly" for first-party) and how it was fulfilled. */
  sellerName: string;
  fulfilment: "cartly" | "seller";
  offerId: string | null;
};

export type OrderStatus =
  | "awaiting_payment"
  | "expired"
  | "placed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type RefundStatus = "pending" | "refunded" | "failed";

/** One step of the order timeline. `at` is when it happened, or when it is expected to. */
export type TimelineStep = { status: OrderStatus; at: Date; reached: boolean };

export type Order = {
  id: string;
  number: string;
  items: OrderItem[];
  subtotalCents: Cents;
  shippingCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
  address: ShippingAddress;
  contactEmail: string;
  /** Card summary once paid; null while awaiting payment. */
  payment: { reference: string; brand: string; last4: string } | null;
  /** When the order record was created. */
  placedAt: Date;
  /** When payment was confirmed (the fulfilment clock starts here); null while unpaid. */
  paidAt: Date | null;
  holdExpiresAt: Date | null;
  refundStatus: RefundStatus | null;
  /** Latest seller handling time among the items, in minutes. */
  deliveryExtraMinutes: number;
  cancelledAt: Date | null;
  /** Derived from the timestamps and the clock when the order is read (see internal/lifecycle.ts). */
  status: OrderStatus;
  cancellable: boolean;
  /** Null once cancelled. */
  estimatedDelivery: Date | null;
  timeline: TimelineStep[];
};

/** Everything `checkout` hands over to create an order awaiting payment (a purchase-time snapshot). */
export type NewOrder = Pick<
  Order,
  | "number"
  | "items"
  | "subtotalCents"
  | "shippingCents"
  | "taxCents"
  | "totalCents"
  | "address"
  | "contactEmail"
  | "placedAt"
  | "holdExpiresAt"
  | "deliveryExtraMinutes"
> & {
  owner: Actor;
  idempotencyKey: string;
};
