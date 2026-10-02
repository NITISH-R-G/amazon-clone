"use server";

// Thin orchestration (docs/modules.md): parse input at the boundary, call one
// module, translate the result into a redirect or form state. No business rules here.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSystemIds } from "@/lib/ports";
import { readGuestActor, ensureGuestActor } from "@/server/guest";
import { getApp } from "@/server/runtime";
import type { FormState } from "./form-state";

const newToken = () => createSystemIds().token();

const cartMessages: Record<string, string> = {
  INVALID_QUANTITY: "Enter a quantity of 1 or more.",
  OUT_OF_STOCK: "Sorry, this item is out of stock.",
  VARIANT_NOT_FOUND: "This item is no longer available.",
  LINE_NOT_FOUND: "That item is no longer in your cart.",
};

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number(),
});

export async function addToCartAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a quantity of 1 or more." };
  const app = await getApp();
  const actor = await ensureGuestActor(newToken);
  const result = await app.cart.addItem(actor, parsed.data.variantId, parsed.data.quantity);
  if (!result.ok) return { error: cartMessages[result.error] ?? "Could not add this item." };
  const clamped = result.value.lines.some((l) => l.clamped);
  revalidatePath("/", "layout");
  redirect(`/cart?added=${encodeURIComponent(parsed.data.variantId)}${clamped ? "&clamped=1" : ""}`);
}

const lineSchema = z.object({ lineId: z.string().min(1), quantity: z.coerce.number().optional() });

export async function updateQuantityAction(formData: FormData): Promise<void> {
  const parsed = lineSchema.safeParse(Object.fromEntries(formData));
  const actor = await readGuestActor();
  if (!parsed.success || !actor) redirect("/cart");
  const app = await getApp();
  const result = await app.cart.setQuantity(actor, parsed.data.lineId, parsed.data.quantity ?? Number.NaN);
  revalidatePath("/", "layout");
  if (!result.ok) redirect(`/cart?error=${result.error}`);
  redirect(result.value.lines.some((l) => l.clamped) ? "/cart?clamped=1" : "/cart");
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const parsed = lineSchema.safeParse(Object.fromEntries(formData));
  const actor = await readGuestActor();
  if (!parsed.success || !actor) redirect("/cart");
  const app = await getApp();
  const result = await app.cart.removeItem(actor, parsed.data.lineId);
  revalidatePath("/", "layout");
  redirect(result.ok ? `/cart?removed=${encodeURIComponent(parsed.data.lineId)}` : `/cart?error=${result.error}`);
}

export async function restoreItemAction(formData: FormData): Promise<void> {
  const parsed = lineSchema.safeParse(Object.fromEntries(formData));
  const actor = await readGuestActor();
  if (!parsed.success || !actor) redirect("/cart");
  const app = await getApp();
  await app.cart.restoreItem(actor, parsed.data.lineId);
  revalidatePath("/", "layout");
  redirect("/cart");
}

const required = (label: string, max = 200) => z.string().trim().min(1, `${label} is required.`).max(max);

const placeOrderSchema = z.object({
  name: required("Full name", 100),
  line1: required("Address", 200),
  line2: z.string().trim().max(200).optional(),
  city: required("City", 100),
  region: required("State or region", 100),
  postalCode: required("Postal code", 20),
  country: z.string().trim().length(2, "Country is required."),
  contactEmail: z.string().trim().email("Enter a valid email address."),
  cardNumber: required("Card number", 25),
  expiry: required("Expiry (MM/YY)", 7),
  cvc: required("Security code", 4),
  idempotencyKey: z.string().min(8),
});

const checkoutMessages: Record<string, string> = {
  EMPTY_CART: "Your cart is empty.",
  OUT_OF_STOCK: "Sorry, an item in your cart just sold out. Review your cart and try again.",
  PAYMENT_DECLINED: "Your card was declined. Check the details or try a different card. You have not been charged.",
  INVALID_ADDRESS: "Check your shipping address and try again.",
};

const SENSITIVE_FIELDS = new Set(["cardNumber", "expiry", "cvc"]);

function safeValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !SENSITIVE_FIELDS.has(key)) values[key] = value;
  }
  return values;
}

export async function placeOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = safeValues(formData);
  const parsed = placeOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [key, messages] of Object.entries(flat)) if (messages?.[0]) fieldErrors[key] = messages[0];
    return { error: "Please correct the highlighted fields.", fieldErrors, values };
  }
  const actor = await readGuestActor();
  if (!actor) return { error: checkoutMessages.EMPTY_CART, values };

  const d = parsed.data;
  const app = await getApp();
  const result = await app.checkout.placeOrder(actor, {
    address: {
      name: d.name,
      line1: d.line1,
      line2: d.line2 || undefined,
      city: d.city,
      region: d.region,
      postalCode: d.postalCode,
      country: d.country.toUpperCase(),
    },
    contactEmail: d.contactEmail,
    payment: { number: d.cardNumber, expiry: d.expiry, cvc: d.cvc },
    idempotencyKey: d.idempotencyKey,
  });
  if (!result.ok) return { error: checkoutMessages[result.error] ?? "We could not place your order.", values };
  revalidatePath("/", "layout");
  redirect(`/checkout/confirmation/${result.value.id}`);
}
