import { cancelOrderAction } from "@/app/orders-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/modules/orders";
import { LocalTime } from "./local-time";

export const statusLabel: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  expired: "Expired",
  placed: "Placed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const stepLabel: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  expired: "Payment window ended",
  placed: "Order placed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Order cancelled",
};

const cancelMessages: Record<string, string> = {
  late: "This order has already shipped, so it can no longer be cancelled.",
  missing: "We could not find that order.",
};

function refundNote(order: Order): string {
  if (!order.paidAt) return " Nothing was charged.";
  if (order.refundStatus === "refunded") return " Your payment has been refunded.";
  if (order.refundStatus === "failed") return " The refund did not go through yet; we will retry it.";
  return " Your refund is being processed.";
}

/** Where the order is, when each step happens, and (while it is still possible) a way to cancel. */
export function OrderStatusPanel({ order, returnTo, cancelNotice }: { order: Order; returnTo: string; cancelNotice?: string }) {
  const iso = (d: Date) => d.toISOString();
  const last = order.timeline.filter((s) => s.reached).at(-1);
  const shipsAt = order.timeline.find((s) => s.status === "shipped")?.at;

  return (
    <section aria-labelledby="order-status" className="space-y-6">
      <div className="space-y-1">
        <h2 id="order-status" className="text-lg font-semibold">
          {statusLabel[order.status]}
        </h2>
        <p className="text-sm text-muted-foreground">
          {order.status === "delivered" && last ? (
            <>
              Delivered <LocalTime iso={iso(last.at)} />
            </>
          ) : order.status === "cancelled" && order.cancelledAt ? (
            <>
              Cancelled <LocalTime iso={iso(order.cancelledAt)} />.{refundNote(order)}
            </>
          ) : order.estimatedDelivery ? (
            <>
              Estimated delivery <LocalTime iso={iso(order.estimatedDelivery)} />
            </>
          ) : null}
        </p>
      </div>

      <ol className="space-y-0">
        {order.timeline.map((step, i) => (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {i < order.timeline.length - 1 ? (
              <span aria-hidden="true" className={cn("absolute top-5 left-[7px] h-full w-px", step.reached && order.timeline[i + 1].reached ? "bg-foreground" : "bg-border")} />
            ) : null}
            <span
              aria-hidden="true"
              className={cn("relative mt-1 size-[15px] shrink-0 rounded-full border-2", step.reached ? "border-foreground bg-foreground" : "border-input bg-background")}
            />
            <div className="min-w-0">
              <p className={cn("text-[15px] leading-6", step.reached ? "font-medium" : "text-muted-foreground")}>
                {stepLabel[step.status]}
                <span className="sr-only">{step.reached ? " (done)" : " (upcoming)"}</span>
              </p>
              <p className="num text-sm text-muted-foreground">
                {step.reached ? null : "Expected "}
                <LocalTime iso={iso(step.at)} />
              </p>
            </div>
          </li>
        ))}
      </ol>

      {cancelNotice && cancelMessages[cancelNotice] ? (
        <Alert variant="destructive">
          <AlertDescription role="alert">{cancelMessages[cancelNotice]}</AlertDescription>
        </Alert>
      ) : null}

      {order.cancellable ? (
        <form action={cancelOrderAction} className="space-y-2 border-t pt-6">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="outline">
            Cancel order
          </Button>
          {shipsAt ? (
            <p className="text-sm text-muted-foreground">
              You can cancel until it ships at <LocalTime iso={iso(shipsAt)} />.
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
