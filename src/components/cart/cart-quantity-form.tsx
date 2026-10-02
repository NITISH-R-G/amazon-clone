"use client";

import { useRef } from "react";
import { updateQuantityAction } from "@/app/actions";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { MAX_PER_SELECTION } from "@/lib/limits";

/** Submits automatically when the quantity changes; the server clamps to stock. */
export function CartQuantityForm({ lineId, quantity }: { lineId: string; quantity: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateQuantityAction}>
      <input type="hidden" name="lineId" value={lineId} />
      <QuantityStepper
        name="quantity"
        defaultValue={quantity}
        max={MAX_PER_SELECTION}
        onCommit={(value) => {
          if (value !== quantity) formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}
