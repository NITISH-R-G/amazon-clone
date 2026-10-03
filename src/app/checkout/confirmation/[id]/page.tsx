import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OrderDetail } from "@/components/orders/order-detail";
import { OrderStatusPanel } from "@/components/orders/order-status";
import { Button } from "@/components/ui/button";
import { getApp } from "@/server/runtime";
import { readActor, readUser } from "@/server/session";

export const metadata: Metadata = { title: "Order placed" };

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/checkout/confirmation/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await readActor();
  if (!actor || !z.uuid().safeParse(id).success) notFound();
  const app = await getApp();
  // Returning from Stripe is not proof of payment: ask the provider (server side) and let checkout decide.
  const view = await app.checkout.syncPayment(actor, id);
  const order = view?.order;
  if (!order) notFound();
  if (!order.paidAt) {
    const failed = view?.payment?.status === "failed";
    const ended = Boolean(order.cancelledAt) || order.status === "expired";
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12">
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">{failed ? "Payment not completed" : ended ? "Checkout ended" : "Confirming your payment"}</h1>
        <p role="status" className="text-muted-foreground">
          {failed
            ? "Your payment did not go through and you have not been charged."
            : ended
              ? "This checkout is no longer open. Nothing was charged."
              : "We are waiting for confirmation from the payment provider. This usually takes a few seconds: refresh this page."}
        </p>
        <Button asChild>
          <Link href={ended ? "/cart" : `/checkout/pay/${order.id}`}>{ended ? "Back to cart" : failed ? "Try again" : "Back to payment"}</Link>
        </Button>
      </div>
    );
  }
  const user = await readUser();

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-3">
        <h1 className="flex items-center gap-3 text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">
          <CheckCircle2 aria-hidden="true" className="size-8 shrink-0 text-success" />
          Order placed
        </h1>
        <p className="text-muted-foreground">
          Order{" "}
          <strong className="num font-semibold text-foreground" data-testid="order-number">
            {order.number}
          </strong>
          . A receipt goes to {order.contactEmail} (demo: no email is sent).
        </p>
      </header>

      <OrderStatusPanel
        order={order}
        returnTo={`/checkout/confirmation/${order.id}`}
        cancelNotice={typeof sp.cancel === "string" ? sp.cancel : undefined}
      />
      <div className="border-t pt-10">
        <OrderDetail order={order} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-8">
        {user ? (
          <Button asChild variant="outline" className="mr-auto">
            <Link href={`/orders/${order.id}`}>View in your orders</Link>
          </Button>
        ) : (
          <>
            <div className="mr-auto space-y-1">
              <p className="text-[15px] font-medium">Keep track of this order</p>
              <p className="text-sm text-muted-foreground">Create an account and it is saved to your order history.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/register?returnTo=/orders">Create account</Link>
            </Button>
          </>
        )}
        <Button asChild>
          <Link href="/s">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
