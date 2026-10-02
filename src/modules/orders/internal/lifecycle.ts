import type { OrderStatus, TimelineStep } from "../types";

// DEMO TIMELINE (decision D24): real retail takes days; a compressed clock lets a reviewer watch an order progress.
// The status is computed on read from timestamps, so no worker or cron is needed. All thresholds live here.
const MIN = 60_000;
export const SHIPPED_AFTER_MS = 5 * MIN;
export const OUT_FOR_DELIVERY_AFTER_MS = 30 * MIN;
export const DELIVERED_AFTER_MS = 120 * MIN;
/** An order can be cancelled until it ships. */
export const CANCEL_WINDOW_MS = SHIPPED_AFTER_MS;

/** When an order placed at `from` is expected to arrive (also shown on product pages before buying). */
export const estimatedDeliveryFrom = (from: Date): Date => new Date(from.getTime() + DELIVERED_AFTER_MS);

type Lifecycle = {
  status: OrderStatus;
  cancellable: boolean;
  estimatedDelivery: Date | null;
  timeline: TimelineStep[];
};

export function lifecycleOf(placedAt: Date, cancelledAt: Date | null, now: Date): Lifecycle {
  const placed = placedAt.getTime();
  const elapsed = now.getTime() - placed;

  if (cancelledAt && cancelledAt.getTime() <= now.getTime()) {
    return {
      status: "cancelled",
      cancellable: false,
      estimatedDelivery: null,
      timeline: [
        { status: "placed", at: placedAt, reached: true },
        { status: "cancelled", at: cancelledAt, reached: true },
      ],
    };
  }

  const steps: [Exclude<OrderStatus, "cancelled">, number][] = [
    ["placed", 0],
    ["shipped", SHIPPED_AFTER_MS],
    ["out_for_delivery", OUT_FOR_DELIVERY_AFTER_MS],
    ["delivered", DELIVERED_AFTER_MS],
  ];
  const timeline = steps.map(([status, offset]) => ({ status, at: new Date(placed + offset), reached: elapsed >= offset }));
  const status = [...timeline].reverse().find((s) => s.reached)?.status ?? "placed";
  return {
    status,
    cancellable: elapsed < CANCEL_WINDOW_MS,
    estimatedDelivery: estimatedDeliveryFrom(placedAt),
    timeline,
  };
}
