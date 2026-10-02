import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OrderDetail } from "@/components/orders/order-detail";
import { Button } from "@/components/ui/button";
import { getApp } from "@/server/runtime";
import { readActor, readUser } from "@/server/session";

export const metadata: Metadata = { title: "Order placed" };

export default async function ConfirmationPage({ params }: PageProps<"/checkout/confirmation/[id]">) {
  const { id } = await params;
  const actor = await readActor();
  if (!actor || !z.uuid().safeParse(id).success) notFound();
  const order = await (await getApp()).orders.getOrder(actor, id);
  if (!order) notFound();
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

      <OrderDetail order={order} />

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
