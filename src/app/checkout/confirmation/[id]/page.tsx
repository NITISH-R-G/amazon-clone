import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/money";
import { readGuestActor } from "@/server/guest";
import { getApp } from "@/server/runtime";

export const metadata: Metadata = { title: "Order placed" };

export default async function ConfirmationPage({ params }: PageProps<"/checkout/confirmation/[id]">) {
  const { id } = await params;
  const actor = await readGuestActor();
  if (!actor || !z.uuid().safeParse(id).success) notFound();
  const order = await (await getApp()).orders.getOrder(actor, id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="gap-2 p-6">
        <div className="flex items-center gap-3 text-success">
          <CheckCircle2 aria-hidden="true" className="size-8" />
          <h1 className="text-2xl font-bold">Order placed, thank you!</h1>
        </div>
        <p>
          Your order number is <strong data-testid="order-number">{order.number}</strong>. A receipt will be sent to{" "}
          {order.contactEmail} (demo: no email is actually sent).
        </p>
      </Card>

      <Card className="gap-4 p-6">
        <h2 className="text-lg font-bold">Items</h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.variantId} className="flex items-center gap-4 py-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.imageUrl ? <Image src={item.imageUrl} alt="" fill unoptimized className="object-contain" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  Qty {item.quantity} · {formatUsd(item.unitPriceCents)} each
                </p>
              </div>
              <p className="font-medium">{formatUsd(item.unitPriceCents * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Items</dt>
            <dd>{formatUsd(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{order.shippingCents === 0 ? "Free" : formatUsd(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd>{formatUsd(order.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <dt>Order total</dt>
            <dd data-testid="order-total">{formatUsd(order.totalCents)}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-1 p-6 text-sm">
          <h2 className="mb-1 text-lg font-bold">Shipping to</h2>
          <p>{order.address.name}</p>
          <p>{order.address.line1}</p>
          {order.address.line2 ? <p>{order.address.line2}</p> : null}
          <p>
            {order.address.city}, {order.address.region} {order.address.postalCode}
          </p>
        </Card>
        <Card className="gap-1 p-6 text-sm">
          <h2 className="mb-1 text-lg font-bold">Payment</h2>
          <p className="capitalize">
            {order.payment.brand} ending in {order.payment.last4}
          </p>
          <p className="text-muted-foreground">Demo payment: no card was charged.</p>
        </Card>
      </div>

      <Button asChild>
        <Link href="/s">Continue shopping</Link>
      </Button>
    </div>
  );
}
