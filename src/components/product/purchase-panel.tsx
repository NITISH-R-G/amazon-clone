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
import { AvailabilityMessage } from "./availability-message";
import { PriceBlock } from "./price-block";
import { usePurchase } from "./purchase-context";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  title: string;
  optionName: string | null;
  /** Delivery line derived from the checkout shipping rules. */
  shippingNote: string;
};

const FORM_ID = "purchase-form";

/**
 * The purchase area: price, availability, variants, quantity and the primary action.
 * On small screens a sticky bar repeats price and action once this panel scrolls out of view.
 */
export function PurchasePanel({ title, optionName, shippingNote }: Props) {
  const { variants, selected, select } = usePurchase();
  const selectedId = selected.id;
  const [state, action, pending] = useActionState<FormState, FormData>(addToCartAction, {});
  const soldOut = selected.stock < 1;
  const max = Math.min(selected.stock, MAX_PER_SELECTION);

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
        <PriceBlock cents={selected.priceCents} listCents={selected.listPriceCents} size="lg" className="max-xl:hidden" />
        <AvailabilityMessage state={selected.state} quantity={selected.stock} />

        {variants.length > 1 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {optionName ?? "Option"}: <span className="font-normal text-muted-foreground">{selected.label}</span>
            </legend>
            <RadioGroup value={selectedId} onValueChange={select} className="flex flex-wrap gap-2" aria-label={optionName ?? "Option"}>
              {variants.map((v) => (
                <div key={v.id} className="relative">
                  <RadioGroupItem value={v.id} id={`variant-${v.id}`} disabled={v.stock < 1} className="peer sr-only" />
                  <Label
                    htmlFor={`variant-${v.id}`}
                    className={cn(
                      "flex min-h-11 min-w-16 cursor-pointer items-center justify-center rounded-md border border-input px-4 text-sm font-medium transition-colors duration-150",
                      "peer-data-[state=checked]:border-foreground peer-data-[state=checked]:shadow-[inset_0_0_0_1px_var(--foreground)]",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                      "peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground peer-disabled:line-through",
                    )}
                  >
                    {v.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
        ) : null}

        <form id={FORM_ID} action={action} className="space-y-4">
          <input type="hidden" name="variantId" value={selected.id} />
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
        <p id="purchase-note" className="text-sm text-muted-foreground">
          {shippingNote}
        </p>
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
            <p className="num text-base font-semibold">{formatUsd(selected.priceCents)}</p>
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
