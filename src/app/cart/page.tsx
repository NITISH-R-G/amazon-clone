import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { removeItemAction, restoreItemAction } from "@/app/actions";
import { CartQuantityForm } from "@/components/cart/cart-quantity-form";
import { PriceBlock } from "@/components/product/price-block";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { formatUsd } from "@/lib/money";
import { quoteCart } from "@/modules/checkout";
import { readActor } from "@/server/session";
import { getApp } from "@/server/runtime";

export const metadata: Metadata = { title: "Cart" };

const errorMessages: Record<string, string> = {
  INVALID_QUANTITY: "Enter a quantity of 1 or more.",
  LINE_NOT_FOUND: "That item is no longer in your cart.",
  OUT_OF_STOCK: "Sorry, this item is out of stock.",
};

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const actor = await readActor();
  const app = await getApp();
  const cart = actor ? await app.cart.getCart(actor) : { lines: [], itemCount: 0, subtotalCents: 0 };

  const removedLineId = one("removed");
  const error = one("error");
  const blocked = cart.lines.some((l) => !l.available);
  const quote = quoteCart(cart);
  const savingsCents = cart.lines.reduce((sum, l) => sum + (l.listPriceCents ? (l.listPriceCents - l.unitPriceCents) * l.quantity : 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">
        Cart
        {cart.itemCount > 0 ? (
          <span className="num ml-3 text-base font-normal text-muted-foreground">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </span>
        ) : null}
      </h1>

      <div aria-live="polite" className="space-y-3 empty:hidden">
        {removedLineId ? (
          <Alert>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Item removed from your cart.</span>
              <form action={restoreItemAction}>
                <input type="hidden" name="lineId" value={removedLineId} />
                <Button type="submit" variant="link">
                  Undo
                </Button>
              </form>
            </AlertDescription>
          </Alert>
        ) : null}
        {one("added") ? (
          <Alert>
            <AlertDescription>Added to your cart.</AlertDescription>
          </Alert>
        ) : null}
        {one("clamped") ? (
          <Alert>
            <AlertDescription>We reduced the quantity to what is in stock.</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessages[error] ?? "Something went wrong updating your cart."}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {cart.lines.length === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBag aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-xl font-semibold">Your cart is empty</EmptyTitle>
            <EmptyDescription>Add something and it will show up here.</EmptyDescription>
          </EmptyHeader>
          <Button asChild size="lg">
            <Link href="/s">Continue shopping</Link>
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
          <ul className="h-fit divide-y border-y">
            {cart.lines.map((line) => (
              <li key={line.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                <Link href={`/dp/${line.productSlug}`} tabIndex={-1} aria-hidden="true" className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  {line.imageUrl ? <Image src={line.imageUrl} alt="" fill unoptimized sizes="112px" className="object-contain p-2" /> : null}
                </Link>
                <div className="min-w-0 space-y-3">
                  <Link href={`/dp/${line.productSlug}`} className="relative line-clamp-2 text-[15px] leading-5 font-medium before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] hover:underline">
                    {line.title}
                  </Link>
                  <PriceBlock cents={line.unitPriceCents} listCents={line.listPriceCents} size="sm" />
                  {!line.available ? (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      Not enough stock for this quantity. Lower it to continue.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <CartQuantityForm lineId={line.id} quantity={line.quantity} />
                    <form action={removeItemAction}>
                      <input type="hidden" name="lineId" value={line.id} />
                      <Button type="submit" variant="destructive" size="sm" className="h-11 pointer-fine:h-9">
                        Remove<span className="sr-only"> {line.title}</span>
                      </Button>
                    </form>
                  </div>
                </div>
                <p className="num col-span-2 text-right text-base font-semibold sm:col-span-1 sm:text-left">{formatUsd(line.lineTotalCents)}</p>
              </li>
            ))}
          </ul>

          <aside aria-label="Order summary" className="h-fit space-y-4 rounded-xl bg-muted p-6 lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold">Summary</h2>
            <dl className="num space-y-2 text-[15px]">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatUsd(quote.subtotalCents)}</dd>
              </div>
              {savingsCents > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>You save</dt>
                  <dd>{formatUsd(savingsCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-muted-foreground">
                <dt>Estimated shipping</dt>
                <dd>{quote.shippingCents === 0 ? "Free" : formatUsd(quote.shippingCents)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Estimated tax</dt>
                <dd>{formatUsd(quote.taxCents)}</dd>
              </div>
            </dl>
            <Separator className="bg-input" />
            <p className="num flex justify-between text-lg font-semibold">
              <span>Estimated total</span>
              <span>{formatUsd(quote.totalCents)}</span>
            </p>
            {blocked ? (
              <Button size="lg" className="w-full" disabled>
                Checkout
              </Button>
            ) : (
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout">Checkout</Link>
              </Button>
            )}
            <p className="text-sm text-muted-foreground">Final shipping and tax are confirmed at checkout.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
