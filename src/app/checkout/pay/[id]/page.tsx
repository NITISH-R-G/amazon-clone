import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DemoPayment } from "@/components/checkout/demo-payment";
import { StripePayment } from "@/components/checkout/stripe-payment";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";
import { getApp } from "@/server/runtime";
import { readActor } from "@/server/session";

export const metadata: Metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: PageProps<"/checkout/pay/[id]">) {
  const { id } = await params;
  const actor = await readActor();
  if (!actor || !z.uuid().safeParse(id).success) notFound();
  const app = await getApp();
  // If the provider already says it was paid, there is nothing to pay.
  const synced = await app.checkout.syncPayment(actor, id);
  if (!synced) notFound();
  if (synced.order.paidAt) redirect(`/checkout/confirmation/${id}`);
  const session = await app.checkout.getPaymentSession(actor, id);
  if (!session) notFound();
  const { order, payment, clientSecret } = session;

  if (order.cancelledAt || order.status === "expired") {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12">
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">This checkout has ended</h1>
        <p role="alert" className="text-muted-foreground">
          {order.cancelledAt ? "It was cancelled." : "Your items were held for 15 minutes and the time ran out."} Nothing was charged. Go back
          to your cart to start again.
        </p>
        <Button asChild>
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const failed = payment?.status === "failed";
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/cart" className="hover:text-foreground hover:underline">
            Back to cart
          </Link>
        </p>
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">Payment</h1>
        <p className="text-sm text-muted-foreground">
          Order <span className="num font-medium text-foreground">{order.number}</span>. Your items are held for 15 minutes while you pay.
        </p>
      </header>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
        <section className="space-y-4">
          {failed ? (
            <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm font-medium text-destructive">
              Your last payment attempt did not go through. You have not been charged. Try again or use another card.
            </p>
          ) : null}
          {clientSecret && publishableKey ? (
            <>
              <StripePayment
                publishableKey={publishableKey}
                clientSecret={clientSecret}
                returnUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/checkout/confirmation/${id}`}
                totalCents={order.totalCents}
              />
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  Stripe test mode. Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (declined), 4000 0000 0000 9995
                  (insufficient funds), 4000 0027 6000 3184 (3-D Secure). Any future expiry, any CVC.
                </span>
              </p>
            </>
          ) : app.payments.provider.kind === "demo" ? (
            <DemoPayment orderId={id} totalCents={order.totalCents} />
          ) : (
            <p role="alert" className="text-destructive">
              Card payments are not available right now. Please try again later.
            </p>
          )}
        </section>
        <aside aria-label="Order summary" className="num h-fit space-y-3 rounded-xl bg-muted p-6 text-[15px]">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="space-y-1.5 text-sm">
            {order.items.map((i) => (
              <li key={`${i.variantId}${i.offerId ?? ""}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {i.quantity} × {i.title}
                </span>
                <span>{formatUsd(i.unitPriceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          {order.discountCents > 0 ? (
            <div className="flex justify-between border-t border-input pt-3 text-success">
              <span>Coupon {order.couponCode}</span>
              <span>-{formatUsd(order.discountCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-input pt-3 text-muted-foreground">
            <span>Shipping</span>
            <span>{order.shippingCents === 0 ? "Free" : formatUsd(order.shippingCents)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Estimated tax</span>
            <span>{formatUsd(order.taxCents)}</span>
          </div>
          <div className="flex justify-between border-t border-input pt-3 text-lg font-semibold">
            <span>Order total</span>
            <span>{formatUsd(order.totalCents)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
