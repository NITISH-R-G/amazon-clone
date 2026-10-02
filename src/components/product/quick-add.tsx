"use client";

import { Check, Plus } from "lucide-react";
import { useActionState } from "react";
import { quickAddAction } from "@/app/actions";
import type { FormState } from "@/app/form-state";
import { Button } from "@/components/ui/button";

/** Restrained add action for a product card: one unit, in place, with a polite confirmation. */
export function QuickAdd({ variantId, title }: { variantId: string; title: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(quickAddAction, {});
  const added = state.values?.added === "1";
  return (
    <form action={action}>
      <input type="hidden" name="variantId" value={variantId} />
      <Button type="submit" variant="outline" size="sm" className="h-11 sm:h-9" disabled={pending}>
        {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
        {pending ? "Adding" : added ? "Added" : "Add"}
        <span className="sr-only"> {title} to cart</span>
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {added ? `${title} added to cart` : ""}
      </span>
      {state.error ? (
        <span role="alert" className="sr-only">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
