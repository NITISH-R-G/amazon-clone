"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type CategoryFacet = { slug: string; name: string; count: number };
type BrandFacet = { name: string; count: number };
type TypeFacet = { slug: string; name: string; count: number };
type AttributeFacet = { key: string; label: string; values: { value: string; count: number }[] };

const SHOWN = 6;

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

const rowClass = "flex min-h-11 items-center gap-3 text-sm lg:min-h-9";

/** A checkbox group: the first few options, the rest behind "Show all". Selected options always come first. */
function FacetGroup({
  id,
  title,
  options,
  selected,
  onToggle,
}: {
  id: string;
  title: string;
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
}) {
  // A selected value stays listed even when the other filters leave it with no products.
  const listed = [...options, ...selected.filter((s) => !options.some((o) => o.value === s)).map((value) => ({ value, count: 0 }))];
  const rows = [...listed.filter((o) => selected.includes(o.value)), ...listed.filter((o) => !selected.includes(o.value))];
  if (rows.length === 0) return null;
  const row = (o: { value: string; count: number }) => (
    <div key={o.value} className={rowClass}>
      <Checkbox id={`${id}-${o.value}`} checked={selected.includes(o.value)} onCheckedChange={(checked) => onToggle(o.value, checked === true)} />
      <Label htmlFor={`${id}-${o.value}`} className="min-h-11 flex-1 cursor-pointer justify-between text-sm font-normal lg:min-h-9">
        <span>{o.value}</span>
        <span className="num text-xs text-muted-foreground">{o.count}</span>
      </Label>
    </div>
  );
  return (
    <section aria-labelledby={`${id}-title`} className="space-y-1">
      <h2 id={`${id}-title`} className="mb-1 text-sm font-semibold">
        {title}
      </h2>
      {rows.slice(0, SHOWN).map(row)}
      {rows.length > SHOWN ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm text-muted-foreground hover:text-foreground lg:min-h-9">
            <span className="group-open:hidden">Show all ({rows.length})</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          {rows.slice(SHOWN).map(row)}
        </details>
      ) : null}
    </section>
  );
}

/**
 * Filters for the results page. State lives in the URL: every change navigates (page resets to 1),
 * so results are shareable and the back button works. Attribute filters are not hard-coded: they are
 * whatever the selected product type declares as facets.
 */
export function FilterControls({
  categories,
  brands,
  types,
  attributes,
  onNavigate,
}: {
  categories: CategoryFacet[];
  brands: BrandFacet[];
  types: TypeFacet[];
  attributes: AttributeFacet[];
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const href = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const clearAttributes = (next: URLSearchParams) => {
    for (const key of [...next.keys()]) if (key.startsWith("a.")) next.delete(key);
  };
  const navigate = (mutate: (next: URLSearchParams) => void) =>
    startTransition(() => {
      router.push(href(mutate), { scroll: false });
      onNavigate?.();
    });
  const go = (changes: Record<string, string | null>) =>
    navigate((next) => {
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
    });
  const toggleMany = (key: string, value: string, checked: boolean) =>
    navigate((next) => {
      const current = next.getAll(key);
      next.delete(key);
      for (const v of checked ? [...current, value] : current.filter((c) => c !== value)) next.append(key, v);
    });

  const currentCategory = params.get("c");
  const currentType = params.get("t");
  const priceKey = priceKeyOf(params);

  return (
    <div className={cn("space-y-7", pending && "opacity-70 transition-opacity")} aria-busy={pending}>
      <section aria-labelledby="f-cat" className="space-y-1">
        <h2 id="f-cat" className="mb-1 text-sm font-semibold">
          Category
        </h2>
        <ul>
          <li>
            <Link
              href={href((n) => {
                n.delete("c");
                n.delete("t");
                clearAttributes(n);
              })}
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
                href={href((n) => {
                  n.set("c", c.slug);
                  n.delete("t");
                  clearAttributes(n);
                })}
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

      {types.length > 1 || currentType ? (
        <section aria-labelledby="f-type" className="space-y-1">
          <h2 id="f-type" className="mb-1 text-sm font-semibold">
            Type
          </h2>
          <ul>
            {currentType ? (
              <li>
                <Link
                  href={href((n) => {
                    n.delete("t");
                    clearAttributes(n);
                  })}
                  className={cn(rowClass, "justify-between text-muted-foreground hover:text-foreground")}
                  onClick={onNavigate}
                >
                  All types
                </Link>
              </li>
            ) : null}
            {types.map((t) => (
              <li key={t.slug}>
                <Link
                  href={href((n) => {
                    n.set("t", t.slug);
                    clearAttributes(n);
                  })}
                  aria-current={currentType === t.slug ? "true" : undefined}
                  className={cn(rowClass, "justify-between", currentType === t.slug ? "font-semibold" : "text-muted-foreground hover:text-foreground")}
                  onClick={onNavigate}
                >
                  <span>{t.name}</span>
                  <span className="num text-xs font-normal text-muted-foreground">{t.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {attributes.map((facet) => (
        <FacetGroup
          key={facet.key}
          id={`attr-${facet.key}`}
          title={facet.label}
          options={facet.values}
          selected={params.getAll(`a.${facet.key}`)}
          onToggle={(value, checked) => toggleMany(`a.${facet.key}`, value, checked)}
        />
      ))}

      <FacetGroup
        id="brand"
        title="Brand"
        options={brands.map((b) => ({ value: b.name, count: b.count }))}
        selected={params.getAll("b")}
        onToggle={(value, checked) => toggleMany("b", value, checked)}
      />

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
            <Checkbox id={`f-${o.key}`} checked={params.get(o.key) === "1"} onCheckedChange={(checked) => go({ [o.key]: checked ? "1" : null })} />
            <Label htmlFor={`f-${o.key}`} className="min-h-11 flex-1 cursor-pointer text-sm font-normal lg:min-h-9">
              {o.label}
            </Label>
          </div>
        ))}
      </section>
    </div>
  );
}
