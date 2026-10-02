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
};

export type OrderStatus = "placed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

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
  payment: { reference: string; brand: string; last4: string };
  placedAt: Date;
  cancelledAt: Date | null;
  /** Derived from the timestamps and the clock when the order is read (see internal/lifecycle.ts). */
  status: OrderStatus;
  cancellable: boolean;
  /** Null once cancelled. */
  estimatedDelivery: Date | null;
  timeline: TimelineStep[];
};

/** Everything `checkout` hands over to create an order (a purchase-time snapshot). */
export type NewOrder = Omit<Order, "id" | "status" | "cancelledAt" | "cancellable" | "estimatedDelivery" | "timeline"> & {
  owner: Actor;
  idempotencyKey: string;
};
