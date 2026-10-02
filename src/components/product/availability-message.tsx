import { cn } from "@/lib/utils";
import type { AvailabilityState } from "@/modules/catalog";

type Props = {
  state: AvailabilityState;
  /** Units left; shown only for low stock. */
  quantity?: number;
  className?: string;
};

/** Availability in words (never colour alone): in stock, low stock or out of stock. */
export function AvailabilityMessage({ state, quantity, className }: Props) {
  if (state === "out_of_stock") {
    return <p className={cn("text-sm font-medium text-muted-foreground", className)}>Out of stock</p>;
  }
  if (state === "low_stock") {
    return (
      <p className={cn("text-sm font-medium text-foreground", className)}>
        {quantity ? `Only ${quantity} left` : "Low stock"}
      </p>
    );
  }
  return <p className={cn("text-sm font-medium text-success", className)}>In stock</p>;
}
