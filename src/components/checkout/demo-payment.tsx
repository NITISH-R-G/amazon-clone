"use client";

import { useActionState } from "react";
import { payDemoOrderAction } from "@/app/actions";
import type { FormState } from "@/app/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/money";

/** Demo bank card form for the payment page (used when Stripe is not configured). */
export function DemoPayment({ orderId, totalCents }: { orderId: string; totalCents: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(payDemoOrderAction, {});
  return (
    <form action={action} className="space-y-4" aria-label="Payment">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-sm text-muted-foreground">
        Demo payment: no card is charged. Use 4242 4242 4242 4242 to succeed, or 4000 0000 0000 0002 to see a decline.
      </p>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="cardNumber" className="mb-1.5">
            Card number
          </Label>
          <Input id="cardNumber" name="cardNumber" autoComplete="cc-number" inputMode="numeric" placeholder="4242 4242 4242 4242" required />
        </div>
        <div>
          <Label htmlFor="expiry" className="mb-1.5">
            Expiry (MM/YY)
          </Label>
          <Input id="expiry" name="expiry" autoComplete="cc-exp" placeholder="12/30" required />
        </div>
        <div>
          <Label htmlFor="cvc" className="mb-1.5">
            Security code
          </Label>
          <Input id="cvc" name="cvc" autoComplete="cc-csc" inputMode="numeric" placeholder="123" required />
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Processing..." : `Pay ${formatUsd(totalCents)}`}
      </Button>
    </form>
  );
}
