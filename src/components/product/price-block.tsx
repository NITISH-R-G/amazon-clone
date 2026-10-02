import { formatUsd, splitUsd, type Cents } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  cents: Cents;
  /** Original price; shows a strike-through and the saving when higher than `cents`. */
  listCents?: Cents | null;
  size?: "md" | "lg";
  className?: string;
};

/** Price with superscript currency and cents; the full amount is announced once to screen readers. */
export function PriceBlock({ cents, listCents, size = "md", className }: Props) {
  const { whole, fraction } = splitUsd(cents);
  const saving = listCents && listCents > cents ? Math.round(((listCents - cents) * 100) / listCents) : null;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="sr-only">{formatUsd(cents)}</span>
      <span
        aria-hidden="true"
        className={cn("inline-flex items-start font-medium text-foreground", size === "lg" ? "text-3xl" : "text-xl")}
      >
        <span className="mt-[0.3em] text-[0.5em] leading-none">$</span>
        <span className="leading-none">{whole}</span>
        <span className="mt-[0.3em] text-[0.5em] leading-none">{fraction}</span>
      </span>
      {saving ? (
        <>
          <span className="text-sm text-muted-foreground">
            <span className="sr-only">List price </span>
            <s>{formatUsd(listCents!)}</s>
          </span>
          <span className="text-sm font-medium text-deal">Save {saving}%</span>
        </>
      ) : null}
    </div>
  );
}
