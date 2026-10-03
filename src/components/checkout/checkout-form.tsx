"use client";

import { useActionState, useEffect, useRef } from "react";
import { placeOrderAction, startCheckoutAction } from "@/app/actions";
import type { FormState } from "@/app/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/money";

type Field = {
  name: string;
  label: string;
  autoComplete: string;
  inputMode?: "numeric" | "email";
  placeholder?: string;
  optional?: boolean;
  className?: string;
  maxLength?: number;
  /** Formats the value as the user types (card number grouping, expiry slash). */
  format?: (raw: string) => string;
};

const formatCardNumber = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();

const formatExpiry = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const addressFields: Field[] = [
  { name: "name", label: "Full name", autoComplete: "name", className: "sm:col-span-2" },
  { name: "line1", label: "Address", autoComplete: "address-line1", className: "sm:col-span-2" },
  { name: "line2", label: "Apartment, suite, etc. (optional)", autoComplete: "address-line2", optional: true, className: "sm:col-span-2" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "region", label: "State", autoComplete: "address-level1" },
  { name: "postalCode", label: "ZIP code", autoComplete: "postal-code", inputMode: "numeric" },
  { name: "contactEmail", label: "Email for your receipt", autoComplete: "email", inputMode: "email" },
];

const cardFields: Field[] = [
  { name: "cardNumber", label: "Card number", autoComplete: "cc-number", inputMode: "numeric", placeholder: "4242 4242 4242 4242", className: "sm:col-span-2", maxLength: 23, format: formatCardNumber },
  { name: "expiry", label: "Expiry (MM/YY)", autoComplete: "cc-exp", placeholder: "12/30", maxLength: 5, format: formatExpiry },
  { name: "cvc", label: "Security code", autoComplete: "cc-csc", inputMode: "numeric", placeholder: "123", maxLength: 4 },
];

type Summary = {
  lines: { id: string; title: string; quantity: number; lineTotalCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

function SummaryLines({ summary }: { summary: Summary }) {
  return (
    <>
      <ul className="space-y-1.5 text-sm">
        {summary.lines.map((l) => (
          <li key={l.id} className="num flex justify-between gap-3">
            <span className="min-w-0 truncate">
              {l.quantity} × {l.title}
            </span>
            <span>{formatUsd(l.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <dl className="num space-y-2 border-t border-input pt-3 text-[15px]">
        <div className="flex justify-between">
          <dt>Items</dt>
          <dd>{formatUsd(summary.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Shipping</dt>
          <dd>{summary.shippingCents === 0 ? "Free" : formatUsd(summary.shippingCents)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Estimated tax</dt>
          <dd>{formatUsd(summary.taxCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-input pt-3 text-lg font-semibold">
          <dt>Order total</dt>
          <dd>{formatUsd(summary.totalCents)}</dd>
        </div>
      </dl>
    </>
  );
}

type Defaults = Partial<Record<"name" | "contactEmail", string>>;

export function CheckoutForm({
  idempotencyKey,
  summary,
  defaults,
  mode = "demo",
}: {
  mode?: "demo" | "stripe";
  idempotencyKey: string;
  summary: Summary;
  defaults?: Defaults;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "stripe" ? startCheckoutAction : placeOrderAction, {});
  const stripe = mode === "stripe";
  const cta = stripe ? "Continue to payment" : "Place your order";
  const errorRef = useRef<HTMLParagraphElement>(null);

  // After a failed submit, bring the error into view and announce it.
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);

  const renderField = (f: Field) => {
    const error = state.fieldErrors?.[f.name];
    const errorId = `${f.name}-error`;
    return (
      <div key={f.name} className={f.className}>
        <Label htmlFor={f.name} className="mb-1.5">
          {f.label}
        </Label>
        <Input
          id={f.name}
          name={f.name}
          autoComplete={f.autoComplete}
          inputMode={f.inputMode}
          placeholder={f.placeholder}
          maxLength={f.maxLength}
          required={!f.optional}
          defaultValue={state.values?.[f.name] ?? defaults?.[f.name as keyof Defaults]}
          onChange={f.format ? (e) => (e.target.value = f.format!(e.target.value)) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error ? (
          <p id={errorId} className="mt-1 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14" noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="country" value="US" />

      <div className="space-y-10">
        <details className="group rounded-xl bg-muted lg:hidden">
          <summary className="num flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-medium">
            <span>Order summary</span>
            <span className="font-semibold">{formatUsd(summary.totalCents)}</span>
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <SummaryLines summary={summary} />
          </div>
        </details>

        {state.error ? (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-lg border border-destructive/40 p-4 text-sm font-medium text-destructive outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {state.error}
          </p>
        ) : null}

        <section aria-labelledby="shipping-heading" className="space-y-4">
          <div className="space-y-1">
            <h2 id="shipping-heading" className="text-lg font-semibold">
              Shipping address
            </h2>
            <p className="text-sm text-muted-foreground">Demo store: shipping within the United States only.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{addressFields.map(renderField)}</div>
        </section>

        {stripe ? (
          <p className="border-t pt-10 text-sm text-muted-foreground">
            Next you will pay securely with Stripe (test mode). Your items are held for 15 minutes while you pay.
          </p>
        ) : (
        <section aria-labelledby="payment-heading" className="space-y-4 border-t pt-10">
          <div className="space-y-1">
            <h2 id="payment-heading" className="text-lg font-semibold">
              Payment
            </h2>
            <p className="text-sm text-muted-foreground">
              Demo payment: no card is charged. Use 4242 4242 4242 4242 to succeed, or 4000 0000 0000 0002 to see a decline.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{cardFields.map(renderField)}</div>
        </section>
        )}
      </div>

      <aside aria-label="Order summary" className="hidden h-fit space-y-4 rounded-xl bg-muted p-6 lg:sticky lg:top-6 lg:block">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <SummaryLines summary={summary} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Please wait..." : `${cta} · ${formatUsd(summary.totalCents)}`}
        </Button>
        <p className="text-sm text-muted-foreground">{stripe ? "Stripe test mode: no real money moves." : "You will not be charged: this is a demo."}</p>
      </aside>

      <div className="space-y-3 lg:hidden">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Please wait..." : `${cta} · ${formatUsd(summary.totalCents)}`}
        </Button>
        <p className="text-sm text-muted-foreground">{stripe ? "Stripe test mode: no real money moves." : "You will not be charged: this is a demo."}</p>
      </div>
    </form>
  );
}
