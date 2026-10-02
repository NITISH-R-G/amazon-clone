import Image from "next/image";
import { formatUsd } from "@/lib/money";
import type { Order } from "@/modules/orders";

const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });
export const formatOrderDate = (d: Date) => date.format(d);

/** What was bought and paid for, from the purchase-time snapshot. Shared by confirmation and order history. */
export function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
      <section aria-labelledby="order-items">
        <h2 id="order-items" className="sr-only">
          Items
        </h2>
        <ul className="divide-y border-y">
          {order.items.map((item) => (
            <li key={item.variantId} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-5">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {item.imageUrl ? <Image src={item.imageUrl} alt="" fill unoptimized sizes="72px" className="object-contain p-1.5" /> : null}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[15px] leading-5 font-medium">{item.title}</p>
                <p className="num mt-1 text-sm text-muted-foreground">
                  Qty {item.quantity} · {formatUsd(item.unitPriceCents)} each
                </p>
                <p className="text-xs text-muted-foreground">Sold by {item.sellerName}</p>
                {item.sku ? <p className="num text-xs text-muted-foreground">SKU {item.sku}</p> : null}
              </div>
              <p className="num text-base font-semibold">{formatUsd(item.unitPriceCents * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </section>

      <aside aria-label="Order totals" className="h-fit space-y-6 rounded-xl bg-muted p-6">
        <dl className="num space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt>Items</dt>
            <dd>{formatUsd(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Shipping</dt>
            <dd>{order.shippingCents === 0 ? "Free" : formatUsd(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Tax</dt>
            <dd>{formatUsd(order.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-input pt-3 text-lg font-semibold">
            <dt>Order total</dt>
            <dd data-testid="order-total">{formatUsd(order.totalCents)}</dd>
          </div>
        </dl>
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Shipping to</h3>
          <p>{order.address.name}</p>
          <p>{order.address.line1}</p>
          {order.address.line2 ? <p>{order.address.line2}</p> : null}
          <p>
            {order.address.city}, {order.address.region} {order.address.postalCode}
          </p>
        </div>
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Payment</h3>
          {order.payment ? (
            <>
              <p>
                <span className="capitalize">{order.payment.brand}</span> ending in {order.payment.last4}
              </p>
              <p className="text-muted-foreground">Demo payment: no card was charged.</p>
            </>
          ) : (
            <p className="text-muted-foreground">Not paid yet.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
