"use client";

import { useActionState } from "react";
import { addToCartAction } from "@/app/actions";
import type { FormState } from "@/app/form-state";
import { LocalTime } from "@/components/orders/local-time";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";
import type { OfferView } from "@/modules/catalog/offers";

function OfferRow({ variantId, offer, deliveryBase }: { variantId: string; offer: OfferView; deliveryBase: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addToCartAction, {});
  const soldOut = offer.stock < 1;
  const eta = new Date(new Date(deliveryBase).getTime() + offer.handlingMinutes * 60_000).toISOString();
  return (
    <li className="py-4">
      <form action={action} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
        <input type="hidden" name="variantId" value={variantId} />
        <input type="hidden" name="offerId" value={offer.offerId ?? ""} />
        <input type="hidden" name="quantity" value="1" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[15px] font-medium">{offer.sellerName}</p>
          <p className="text-sm text-muted-foreground">Fulfilled by {offer.fulfilment === "cartly" ? "Cartly" : offer.sellerName}</p>
          {soldOut ? (
            <p className="text-sm text-muted-foreground">Out of stock</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Get it by <LocalTime iso={eta} />
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="num text-base font-semibold">
            {formatUsd(offer.priceCents)}
            <span className="block text-right text-xs font-normal text-muted-foreground">
              {offer.shippingCents === 0 ? "Free shipping" : `+ ${formatUsd(offer.shippingCents)} shipping`}
            </span>
          </p>
          <Button type="submit" variant="outline" size="sm" className="h-11 pointer-fine:h-9" disabled={pending || soldOut}>
            {pending ? "Adding..." : "Add to cart"}
            <span className="sr-only"> from {offer.sellerName}</span>
          </Button>
        </div>
        {state.error ? (
          <p role="alert" className="col-span-2 text-sm font-medium text-destructive">
            {state.error}
          </p>
        ) : null}
      </form>
    </li>
  );
}

/** Other ways to buy the selected variant: seller offers, each with its own price, shipping and delivery. */
export function OtherSellers({ variantId, offers, deliveryBase }: { variantId: string; offers: OfferView[]; deliveryBase: string }) {
  if (offers.length === 0) return null;
  const from = Math.min(...offers.filter((o) => o.stock > 0).map((o) => o.priceCents), Number.POSITIVE_INFINITY);
  return (
    <details className="group border-t pt-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
        <span>
          Other sellers ({offers.length})
          {Number.isFinite(from) ? <span className="num font-normal text-muted-foreground"> from {formatUsd(from)}</span> : null}
        </span>
        <span aria-hidden="true" className="text-muted-foreground group-open:hidden">
          Show
        </span>
        <span aria-hidden="true" className="hidden text-muted-foreground group-open:inline">
          Hide
        </span>
      </summary>
      <ul className="divide-y">
        {offers.map((offer) => (
          <OfferRow key={offer.offerId ?? "first-party"} variantId={variantId} offer={offer} deliveryBase={deliveryBase} />
        ))}
      </ul>
    </details>
  );
}
