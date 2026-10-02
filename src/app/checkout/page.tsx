import { ShoppingBag, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getApp } from "@/server/runtime";
import { readActor, readUser } from "@/server/session";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [actor, user] = await Promise.all([readActor(), readUser()]);
  const app = await getApp();
  const cart = actor ? await app.cart.getCart(actor) : null;
  const quote = actor && cart && cart.lines.length > 0 ? await app.checkout.getQuote(actor) : null;

  if (!cart || !quote || !quote.ok) {
    return (
      <Empty className="mx-auto max-w-xl border py-20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingBag aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="text-xl font-semibold">Your cart is empty</EmptyTitle>
          <EmptyDescription>Add something to your cart before checking out.</EmptyDescription>
        </EmptyHeader>
        <Button asChild size="lg">
          <Link href="/s">Continue shopping</Link>
        </Button>
      </Empty>
    );
  }

  if (cart.lines.some((l) => !l.available)) {
    return (
      <Empty className="mx-auto max-w-xl border py-20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="text-xl font-semibold">Check your cart</EmptyTitle>
          <EmptyDescription role="alert">
            An item in your cart is no longer available in the quantity you chose. Lower the quantity or remove it to continue.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild size="lg">
          <Link href="/cart">Review your cart</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/cart" className="hover:text-foreground hover:underline">
            Back to cart
          </Link>
        </p>
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">Checkout</h1>
        {user ? (
          <p className="text-sm text-muted-foreground">Signed in as {user.email}. This order is saved to your account.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No account needed.{" "}
            <Link href="/sign-in?returnTo=/checkout" className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>{" "}
            to save this order to your history.
          </p>
        )}
      </header>
      <CheckoutForm
        idempotencyKey={crypto.randomUUID()}
        summary={{ lines: cart.lines, ...quote.value }}
        defaults={user ? { name: user.name, contactEmail: user.email } : undefined}
      />
    </div>
  );
}
