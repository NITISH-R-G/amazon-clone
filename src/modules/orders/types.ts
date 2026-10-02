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
};

export type OrderStatus = "placed";

export type Order = {
  id: string;
  number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: Cents;
  shippingCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
  address: ShippingAddress;
  contactEmail: string;
  payment: { reference: string; brand: string; last4: string };
  placedAt: Date;
};

/** Everything `checkout` hands over to create an order (a purchase-time snapshot). */
export type NewOrder = Omit<Order, "id" | "status"> & {
  owner: Actor;
  idempotencyKey: string;
};
