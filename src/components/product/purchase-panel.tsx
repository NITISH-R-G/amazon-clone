"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addToCartAction } from "@/app/actions";
import type { FormState } from "@/app/form-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MAX_PER_SELECTION } from "@/lib/limits";
import { formatUsd } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DeliveryLine } from "./delivery-line";
import { availabilityState } from "@/modules/catalog/offers";
import { AvailabilityMessage } from "./availability-message";
import { OtherSellers } from "./other-sellers";
import { PriceBlock } from "./price-block";
import { usePurchase } from "./purchase-context";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  title: string;
  /** Delivery line derived from the checkout shipping rules. */
  shippingNote: string;
  /** ISO time of the page render: the delivery promise is computed from it. */
  deliveryEstimate: string;
};

const FORM_ID = "purchase-form";

/**
 * The purchase area: price, availability, variants, quantity and the primary action.
 * On small screens a sticky bar repeats price and action once this panel scrolls out of view.
 */
export function PurchasePanel({ title, shippingNote, deliveryEstimate }: Props) {
  const { variants, dimensions, states, selected, buyBox, otherOffers, choose } = usePurchase();
  const [state, action, pending] = useActionState<FormState, FormData>(addToCartAction, {});
  const soldOut = buyBox.stock < 1;
  const max = Math.min(buyBox.stock, MAX_PER_SELECTION);

  const panelRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setBarVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={panelRef} className="space-y-5">
        <PriceBlock
          cents={buyBox.priceCents}
          listCents={buyBox.listPriceCents && buyBox.listPriceCents > buyBox.priceCents ? buyBox.listPriceCents : null}
          size="lg"
          className="max-xl:hidden"
        />
        <span className="sr-only" data-testid="purchase-price">
          {formatUsd(buyBox.priceCents)}
        </span>
        <AvailabilityMessage state={availabilityState(buyBox.stock)} quantity={buyBox.stock} />
        <p data-testid="seller" className="text-sm text-muted-foreground">
          Sold by <span className="font-medium text-foreground">{buyBox.sellerName}</span>
          {" · "}
          Fulfilled by {buyBox.fulfilment === "cartly" ? "Cartly" : buyBox.sellerName}
        </p>
        {selected.sku ? (
          <p data-testid="sku" className="num text-xs text-muted-foreground">
            SKU {selected.sku}
          </p>
        ) : null}

        {dimensions.length > 0 && variants.length > 1
          ? dimensions.map((dimension) => (
              <fieldset key={dimension.key} className="space-y-2">
                <legend className="text-sm font-medium">
                  {dimension.label}: <span className="font-normal text-muted-foreground">{selected.selections[dimension.key]}</span>
                </legend>
                <RadioGroup
                  value={selected.selections[dimension.key]}
                  onValueChange={(value) => choose(dimension.key, value)}
                  className="flex flex-wrap gap-2"
                  aria-label={dimension.label}
                >
                  {dimension.values.map((value) => {
                    const state = states[dimension.key]?.[value];
                    const id = `opt-${dimension.key}-${value}`;
                    return (
                      <div key={value} className="relative">
                        <RadioGroupItem value={value} id={id} className="peer sr-only" />
                        <Label
                          htmlFor={id}
                          className={cn(
                            "flex min-h-11 min-w-16 cursor-pointer items-center justify-center rounded-md border border-input px-4 text-sm font-medium transition-colors duration-150",
                            "peer-data-[state=checked]:border-foreground peer-data-[state=checked]:shadow-[inset_0_0_0_1px_var(--foreground)]",
                            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                            state && !state.compatible && "text-muted-foreground",
                            state && !state.inStock && "text-muted-foreground line-through",
                          )}
                        >
                          {value}
                          {state && !state.inStock ? <span className="sr-only"> (out of stock)</span> : null}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </fieldset>
            ))
          : null}

        <form id={FORM_ID} action={action} className="space-y-4">
          <input type="hidden" name="variantId" value={selected.id} />
          <input type="hidden" name="offerId" value={buyBox.offerId ?? ""} />
          {!soldOut ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" aria-hidden="true">
                Quantity
              </span>
              <QuantityStepper key={selected.id} name="quantity" max={max} />
            </div>
          ) : null}
          {state.error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={pending || soldOut} aria-describedby="purchase-note">
            {soldOut ? "Currently unavailable" : pending ? "Adding..." : "Add to cart"}
          </Button>
        </form>
        {soldOut ? null : (
          <p className="text-sm text-muted-foreground">
            <DeliveryLine nowIso={deliveryEstimate} legs={[buyBox]} className="text-foreground" />
            <span> if you order now. Exact date at checkout.</span>
          </p>
        )}
        <p id="purchase-note" className="text-sm text-muted-foreground">
          {shippingNote}
        </p>
        <OtherSellers variantId={selected.id} offers={otherOffers} deliveryBase={deliveryEstimate} />
      </div>

      {/* Sticky purchase bar (small screens only): appears when the panel has scrolled above the viewport. */}
      <div
        aria-hidden={!barVisible}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out lg:hidden",
          barVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="num text-base font-semibold">{formatUsd(buyBox.priceCents)}</p>
            <p className="truncate text-xs text-muted-foreground">{title}</p>
          </div>
          <Button type="submit" form={FORM_ID} size="lg" disabled={pending || soldOut} tabIndex={barVisible ? 0 : -1}>
            {soldOut ? "Unavailable" : "Add to cart"}
          </Button>
        </div>
      </div>
    </>
  );
}
