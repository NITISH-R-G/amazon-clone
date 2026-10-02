"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type CategoryFacet = { slug: string; name: string; count: number };

const PRICE_BUCKETS = [
  { key: "any", label: "Any price" },
  { key: "u25", label: "Under $25", max: "25" },
  { key: "25-50", label: "$25 to $50", min: "25", max: "50" },
  { key: "50-100", label: "$50 to $100", min: "50", max: "100" },
  { key: "100+", label: "$100 and up", min: "100" },
] as const;

function priceKeyOf(params: URLSearchParams): string {
  const min = params.get("min") ?? undefined;
  const max = params.get("max") ?? undefined;
  return PRICE_BUCKETS.find((b) => ("min" in b ? b.min : undefined) === min && ("max" in b ? b.max : undefined) === max)?.key ?? "any";
}

/**
 * Filters for the results page. State lives in the URL: every change navigates (page resets to 1),
 * so results are shareable and the back button works.
 */
export function FilterControls({ categories, onNavigate }: { categories: CategoryFacet[]; onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const go = (changes: Record<string, string | null>) =>
    startTransition(() => {
      router.push(hrefWith(changes), { scroll: false });
      onNavigate?.();
    });

  const currentCategory = params.get("c");
  const priceKey = priceKeyOf(params);
  const rowClass = "flex min-h-11 items-center gap-3 text-sm lg:min-h-9";

  return (
    <div className={cn("space-y-7", pending && "opacity-70 transition-opacity")} aria-busy={pending}>
      <section aria-labelledby="f-cat" className="space-y-1">
        <h2 id="f-cat" className="mb-1 text-sm font-semibold">
          Category
        </h2>
        <ul>
          <li>
            <Link
              href={hrefWith({ c: null })}
              aria-current={!currentCategory ? "true" : undefined}
              className={cn(rowClass, "justify-between", !currentCategory ? "font-semibold" : "text-muted-foreground hover:text-foreground")}
              onClick={onNavigate}
            >
              All
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={hrefWith({ c: c.slug })}
                aria-current={currentCategory === c.slug ? "true" : undefined}
                className={cn(rowClass, "justify-between", currentCategory === c.slug ? "font-semibold" : "text-muted-foreground hover:text-foreground")}
                onClick={onNavigate}
              >
                <span>{c.name}</span>
                <span className="num text-xs font-normal text-muted-foreground">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="f-price" className="space-y-1">
        <h2 id="f-price" className="mb-1 text-sm font-semibold">
          Price
        </h2>
        <RadioGroup
          value={priceKey}
          onValueChange={(key) => {
            const b = PRICE_BUCKETS.find((x) => x.key === key);
            go({ min: b && "min" in b ? b.min : null, max: b && "max" in b ? b.max : null });
          }}
          aria-labelledby="f-price"
          className="gap-0"
        >
          {PRICE_BUCKETS.map((b) => (
            <div key={b.key} className={rowClass}>
              <RadioGroupItem value={b.key} id={`price-${b.key}`} />
              <Label htmlFor={`price-${b.key}`} className="min-h-11 flex-1 cursor-pointer text-sm font-normal lg:min-h-9">
                {b.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </section>

      <section aria-labelledby="f-rating" className="space-y-1">
        <h2 id="f-rating" className="mb-1 text-sm font-semibold">
          Rating
        </h2>
        <RadioGroup
          value={params.get("r") === "4" ? "4" : "any"}
          onValueChange={(v) => go({ r: v === "4" ? "4" : null })}
          aria-labelledby="f-rating"
          className="gap-0"
        >
          {[
            { v: "any", label: "Any rating" },
            { v: "4", label: "4 stars and up" },
          ].map((o) => (
            <div key={o.v} className={rowClass}>
              <RadioGroupItem value={o.v} id={`rating-${o.v}`} />
              <Label htmlFor={`rating-${o.v}`} className="min-h-11 flex-1 cursor-pointer text-sm font-normal lg:min-h-9">
                {o.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </section>

      <section aria-labelledby="f-avail" className="space-y-1">
        <h2 id="f-avail" className="mb-1 text-sm font-semibold">
          Availability
        </h2>
        {[
          { key: "stock", label: "In stock only" },
          { key: "sale", label: "On sale" },
        ].map((o) => (
          <div key={o.key} className={rowClass}>
            <Checkbox
              id={`f-${o.key}`}
              checked={params.get(o.key) === "1"}
              onCheckedChange={(checked) => go({ [o.key]: checked ? "1" : null })}
            />
            <Label htmlFor={`f-${o.key}`} className="min-h-11 flex-1 cursor-pointer text-sm font-normal lg:min-h-9">
              {o.label}
            </Label>
          </div>
        ))}
      </section>
    </div>
  );
}
