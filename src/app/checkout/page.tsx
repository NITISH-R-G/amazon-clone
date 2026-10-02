import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { readGuestActor } from "@/server/guest";
import { getApp } from "@/server/runtime";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const actor = await readGuestActor();
  const app = await getApp();
  const cart = actor ? await app.cart.getCart(actor) : null;
  const quote = actor && cart && cart.lines.length > 0 ? await app.checkout.getQuote(actor) : null;

  if (!cart || !quote || !quote.ok) {
    return (
      <Card className="mx-auto max-w-md items-center gap-3 p-10 text-center">
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground">Add something to your cart before checking out.</p>
        <Button asChild>
          <Link href="/">Continue shopping</Link>
        </Button>
      </Card>
    );
  }

  if (cart.lines.some((l) => !l.available)) {
    return (
      <Card className="mx-auto max-w-md items-center gap-3 p-10 text-center">
        <h1 className="text-xl font-bold">Check your cart</h1>
        <p role="alert" className="text-destructive">
          An item in your cart is no longer available in the quantity you chose.
        </p>
        <Button asChild>
          <Link href="/cart">Review your cart</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <CheckoutForm
        idempotencyKey={crypto.randomUUID()}
        summary={{ lines: cart.lines, ...quote.value }}
      />
    </div>
  );
}
