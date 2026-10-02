import { Package } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatOrderDate } from "@/components/orders/order-detail";
import { statusLabel } from "@/components/orders/order-status";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatUsd } from "@/lib/money";
import { getApp } from "@/server/runtime";
import { readUser } from "@/server/session";

export const metadata: Metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const user = await readUser();
  if (!user) redirect("/sign-in?returnTo=/orders");
  const orders = await (await getApp()).orders.listOrders({ userId: user.id });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">Your orders</h1>

      {orders.length === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-xl font-semibold">No orders yet</EmptyTitle>
            <EmptyDescription>Orders you place while signed in will appear here.</EmptyDescription>
          </EmptyHeader>
          <Button asChild size="lg">
            <Link href="/s">Start shopping</Link>
          </Button>
        </Empty>
      ) : (
        <ul className="divide-y border-y">
          {orders.map((order) => {
            const units = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 py-5 hover:bg-muted/50 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                >
                  <div className="col-span-2 flex gap-2 sm:col-span-1">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.variantId} className="relative size-14 overflow-hidden rounded-lg bg-muted">
                        {item.imageUrl ? <Image src={item.imageUrl} alt="" fill unoptimized sizes="56px" className="object-contain p-1" /> : null}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="num text-[15px] font-medium">{order.number}</p>
                    <p className="num text-sm text-muted-foreground">
                      {formatOrderDate(order.placedAt)} · {units} {units === 1 ? "item" : "items"} · {statusLabel[order.status]}
                    </p>
                  </div>
                  <p className="num text-base font-semibold">{formatUsd(order.totalCents)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
