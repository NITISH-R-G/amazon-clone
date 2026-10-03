"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";

function PayForm({ returnUrl, totalCents }: { returnUrl: string; totalCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage(null);
    // On success (or after 3-D Secure) Stripe redirects to return_url. We do not trust that redirect:
    // the server confirms the payment from Stripe's signed webhook or by asking Stripe itself.
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });
    if (error) setMessage(error.message ?? "Your payment could not be completed. Try another card.");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-label="Payment">
      <PaymentElement />
      {message ? (
        <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm font-medium text-destructive">
          {message}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || busy}>
        {busy ? "Processing..." : `Pay ${formatUsd(totalCents)}`}
      </Button>
    </form>
  );
}

export function StripePayment({
  publishableKey,
  clientSecret,
  returnUrl,
  totalCents,
}: {
  publishableKey: string;
  clientSecret: string;
  returnUrl: string;
  totalCents: number;
}) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#0a0a0a", borderRadius: "6px" } } }}
    >
      <PayForm returnUrl={returnUrl} totalCents={totalCents} />
    </Elements>
  );
}
