import { deliveryPromise, slowestPromise } from "@/modules/catalog/delivery";
import type { Fulfilment } from "@/modules/catalog/offers";

type Leg = { fulfilment: Fulfilment; handlingMinutes: number };

/**
 * The delivery promise as text: "Arrives Wed, Oct 7 - Thu, Oct 8". Pure and deterministic for a given `nowIso`,
 * so the server render and the client agree. With several legs (a cart), the slowest decides.
 */
export function DeliveryLine({
  nowIso,
  legs,
  postalCode,
  className,
  prefix = "Arrives",
}: {
  nowIso: string;
  legs: Leg[];
  postalCode?: string | null;
  className?: string;
  prefix?: string;
}) {
  const now = new Date(nowIso);
  const promise = slowestPromise(legs.map((l) => deliveryPromise({ now, fulfilment: l.fulfilment, handlingMinutes: l.handlingMinutes, postalCode })));
  if (!promise) return null;
  return (
    <span className={className} data-testid="delivery-promise">
      {prefix} <span className="font-medium text-foreground">{promise.label}</span>
    </span>
  );
}
