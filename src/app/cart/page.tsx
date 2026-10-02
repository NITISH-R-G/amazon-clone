import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { removeItemAction, restoreItemAction } from "@/app/actions";
import { CartQuantityForm } from "@/components/cart/cart-quantity-form";
import { PriceBlock } from "@/components/product/price-block";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatUsd } from "@/lib/money";
import { readGuestActor } from "@/server/guest";
import { getApp } from "@/server/runtime";

export const metadata: Metadata = { title: "Your cart" };

const errorMessages: Record<string, string> = {
  INVALID_QUANTITY: "Enter a quantity of 1 or more.",
  LINE_NOT_FOUND: "That item is no longer in your cart.",
  OUT_OF_STOCK: "Sorry, this item is out of stock.",
};

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const actor = await readGuestActor();
  const app = await getApp();
  const cart = actor ? await app.cart.getCart(actor) : { lines: [], itemCount: 0, subtotalCents: 0 };

  const removedLineId = one("removed");
  const error = one("error");
  const blocked = cart.lines.some((l) => !l.available);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Your cart</h1>

      {removedLineId ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3 text-sm">
          <span>Item removed from your cart.</span>
          <form action={restoreItemAction}>
            <input type="hidden" name="lineId" value={removedLineId} />
            <Button type="submit" variant="link" className="h-auto p-0 text-link">
              Undo
            </Button>
          </form>
        </div>
      ) : null}
      {one("added") ? (
        <p role="status" className="rounded-md border border-success/40 bg-card p-3 text-sm font-medium text-success">
          Added to your cart.
        </p>
      ) : null}
      {one("clamped") ? (
        <p role="status" className="rounded-md border bg-card p-3 text-sm">
          We reduced the quantity to what is in stock.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-card p-3 text-sm font-medium text-destructive">
          {errorMessages[error] ?? "Something went wrong updating your cart."}
        </p>
      ) : null}

      {cart.lines.length === 0 ? (
        <Card className="items-center space-y-3 p-10 text-center">
          <h2 className="text-lg font-bold">Your cart is empty</h2>
          <p className="text-muted-foreground">Add something from the shop and it will show up here.</p>
          <Button asChild>
            <Link href="/">Continue shopping</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="divide-y p-0">
            <ul className="divide-y">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex gap-4 p-4">
                  <Link href={`/dp/${line.productSlug}`} className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {line.imageUrl ? <Image src={line.imageUrl} alt="" fill unoptimized className="object-contain" /> : null}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Link href={`/dp/${line.productSlug}`} className="line-clamp-2 font-medium hover:underline">
                      {line.title}
                    </Link>
                    {!line.available ? (
                      <p className="text-sm font-medium text-deal">Not enough stock for this quantity. Lower the quantity to continue.</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <CartQuantityForm lineId={line.id} quantity={line.quantity} />
                      <form action={removeItemAction}>
                        <input type="hidden" name="lineId" value={line.id} />
                        <Button type="submit" variant="link" className="h-auto p-0 text-link">
                          Remove<span className="sr-only"> {line.title}</span>
                        </Button>
                      </form>
                    </div>
                  </div>
                  <div className="text-right">
                    <PriceBlock cents={line.lineTotalCents} className="justify-end" />
                    {line.quantity > 1 ? (
                      <p className="text-xs text-muted-foreground">{formatUsd(line.unitPriceCents)} each</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="h-fit space-y-4 p-4">
            <p className="text-lg">
              Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}):{" "}
              <span className="font-bold">{formatUsd(cart.subtotalCents)}</span>
            </p>
            <p className="text-sm text-muted-foreground">Shipping and tax are calculated at checkout.</p>
            <Separator />
            {blocked ? (
              <Button size="lg" className="w-full" disabled>
                Proceed to checkout
              </Button>
            ) : (
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout">Proceed to checkout</Link>
              </Button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
