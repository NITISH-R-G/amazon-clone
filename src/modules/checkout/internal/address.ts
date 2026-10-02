import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

/** Validates a shipping address at the checkout boundary. */
export const shippingAddressSchema = z.object({
  name: text(100),
  line1: text(200),
  line2: z.string().trim().max(200).optional(),
  city: text(100),
  region: text(100),
  postalCode: text(20),
  country: text(2),
});
