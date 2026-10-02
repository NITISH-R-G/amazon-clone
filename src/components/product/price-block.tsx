import { formatUsd, type Cents } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  cents: Cents;
  /** Original price; shows a struck price and the saving only when higher than `cents`. */
  listCents?: Cents | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-base leading-6 font-semibold",
  md: "text-xl leading-7 font-semibold",
  lg: "text-[32px] leading-[38px] font-semibold tracking-[-0.02em]",
} as const;

/** Price with tabular numerals. The current price leads; the list price and saving are quiet. */
export function PriceBlock({ cents, listCents, size = "md", className }: Props) {
  const saving = listCents && listCents > cents ? Math.round(((listCents - cents) * 100) / listCents) : null;
  return (
    <p className={cn("num flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={sizes[size]}>{formatUsd(cents)}</span>
      {saving ? (
        <>
          <span className="text-sm text-muted-foreground">
            <span className="sr-only">List price </span>
            <s>{formatUsd(listCents!)}</s>
          </span>
          <span className="text-sm font-medium text-success">Save {saving}%</span>
        </>
      ) : null}
    </p>
  );
}
