import { X } from "lucide-react";
import Link from "next/link";
import { toSearchParams, type SearchQuery } from "@/modules/search";

type Chip = { label: string; clear: Partial<SearchQuery> };

/** Applied filters as removable chips (plain links, so they work without JS). */
export function AppliedFilters({
  query,
  categoryName,
  typeName,
  attributeLabels = {},
}: {
  query: SearchQuery;
  categoryName?: string;
  typeName?: string;
  attributeLabels?: Record<string, string>;
}) {
  const chips: Chip[] = [];
  if (query.text) chips.push({ label: `"${query.text}"`, clear: { text: undefined } });
  if (query.categorySlug) chips.push({ label: categoryName ?? query.categorySlug, clear: { categorySlug: undefined } });
  if (query.typeSlug) chips.push({ label: typeName ?? query.typeSlug, clear: { typeSlug: undefined, attributes: undefined } });
  for (const [key, values] of Object.entries(query.attributes ?? {})) {
    for (const value of values) {
      const rest = values.filter((v) => v !== value);
      const attributes = { ...query.attributes, [key]: rest };
      if (rest.length === 0) delete attributes[key];
      chips.push({ label: `${attributeLabels[key] ?? key}: ${value}`, clear: { attributes: Object.keys(attributes).length > 0 ? attributes : undefined } });
    }
  }
  for (const brand of query.brands ?? []) {
    chips.push({ label: brand, clear: { brands: (query.brands ?? []).filter((b) => b !== brand) } });
  }
  if (query.minPriceCents !== undefined || query.maxPriceCents !== undefined) {
    const lo = query.minPriceCents !== undefined ? `$${query.minPriceCents / 100}` : null;
    const hi = query.maxPriceCents !== undefined ? `$${query.maxPriceCents / 100}` : null;
    chips.push({
      label: lo && hi ? `${lo} to ${hi}` : lo ? `${lo} and up` : `Under ${hi}`,
      clear: { minPriceCents: undefined, maxPriceCents: undefined },
    });
  }
  if (query.minRating) chips.push({ label: `${query.minRating} stars and up`, clear: { minRating: undefined } });
  if (query.inStockOnly) chips.push({ label: "In stock", clear: { inStockOnly: undefined } });
  if (query.onSale) chips.push({ label: "On sale", clear: { onSale: undefined } });
  if (chips.length === 0) return null;

  const hrefWithout = (clear: Partial<SearchQuery>) => {
    const qs = toSearchParams({ ...query, ...clear, page: 1 }).toString();
    return qs ? `/s?${qs}` : "/s";
  };

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Applied filters">
      {chips.map((c) => (
        <li key={c.label}>
          <Link
            href={hrefWithout(c.clear)}
            className="inline-flex min-h-11 pointer-fine:min-h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm transition-colors duration-150 hover:bg-muted"
          >
            {c.label}
            <X aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Remove filter</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
