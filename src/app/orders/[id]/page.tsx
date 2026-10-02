import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { formatOrderDate, OrderDetail } from "@/components/orders/order-detail";
import { OrderStatusPanel } from "@/components/orders/order-status";
import { getApp } from "@/server/runtime";
import { readUser } from "@/server/session";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await readUser();
  if (!user) redirect(`/sign-in?returnTo=/orders/${encodeURIComponent(id)}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await (await getApp()).orders.getOrder({ userId: user.id }, id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/orders" className="hover:text-foreground hover:underline">
            Your orders
          </Link>
        </p>
        <h1 className="num text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">{order.number}</h1>
        <p className="num text-muted-foreground">Placed {formatOrderDate(order.placedAt)}</p>
      </header>
      <OrderStatusPanel order={order} returnTo={`/orders/${order.id}`} cancelNotice={typeof sp.cancel === "string" ? sp.cancel : undefined} />
      <div className="border-t pt-10">
        <OrderDetail order={order} />
      </div>
    </div>
  );
}
