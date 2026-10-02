"use client";

import { useActionState } from "react";
import { addToCartAction } from "@/app/actions";
import type { FormState } from "@/app/form-state";
import { Button } from "@/components/ui/button";
import { MAX_PER_SELECTION } from "@/lib/limits";
import { QuantityStepper } from "./quantity-stepper";

export function AddToCartForm({ variantId, stock }: { variantId: string; stock: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addToCartAction, {});
  const max = Math.min(stock, MAX_PER_SELECTION);

  if (stock < 1) {
    return (
      <div className="space-y-3">
        <p className="font-medium text-deal">Currently unavailable</p>
        <Button type="button" size="lg" disabled className="w-full">
          Add to cart
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="variantId" value={variantId} />
      <p className="font-medium text-success">{stock <= 5 ? `Only ${stock} left in stock` : "In stock"}</p>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          Qty
        </span>
        <QuantityStepper name="quantity" max={max} />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add to cart"}
      </Button>
    </form>
  );
}
