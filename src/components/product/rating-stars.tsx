import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  rating: number;
  count?: number;
  className?: string;
};

/** Five stars filled to the rating (clipped, so 4.5 shows half a star). Announced once as text. */
export function RatingStars({ rating, count, className }: Props) {
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <p className={cn("flex items-center gap-1.5 text-[13px] leading-[18px] text-muted-foreground", className)}>
      <span className="sr-only">
        Rated {rating.toFixed(1)} out of 5{count !== undefined ? `, ${count.toLocaleString("en-US")} ratings` : ""}
      </span>
      <span aria-hidden="true" className="relative inline-flex">
        <span className="flex text-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="size-3.5 fill-current" strokeWidth={0} />
          ))}
        </span>
        <span className="absolute inset-y-0 left-0 flex overflow-hidden text-foreground" style={{ width: `${percent}%` }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="size-3.5 shrink-0 fill-current" strokeWidth={0} />
          ))}
        </span>
      </span>
      <span aria-hidden="true" className="num">
        {rating.toFixed(1)}
        {count !== undefined ? <span className="text-muted-foreground"> ({count.toLocaleString("en-US")})</span> : null}
      </span>
    </p>
  );
}
