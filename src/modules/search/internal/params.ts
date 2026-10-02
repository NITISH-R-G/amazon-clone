import { SORT_KEYS, type SearchQuery, type SortKey } from "../types";

type ParamInput = URLSearchParams | Record<string, string | string[] | undefined>;

function read(input: ParamInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  const v = input[key];
  return Array.isArray(v) ? v[0] : v;
}

const wholeNumber = (v: string | undefined): number | undefined =>
  v !== undefined && /^\d{1,7}$/.test(v) ? Number(v) : undefined;

/** URL to query. Anything invalid falls back to a safe default instead of throwing. */
export function parseSearchParams(input: ParamInput): SearchQuery {
  const text = read(input, "k")?.trim();
  const category = read(input, "c")?.trim();
  const min = wholeNumber(read(input, "min"));
  const max = wholeNumber(read(input, "max"));
  const rating = Number(read(input, "r"));
  const sort = read(input, "sort") as SortKey | undefined;
  const page = Number(read(input, "page"));

  return {
    text: text || undefined,
    categorySlug: category || undefined,
    minPriceCents: min === undefined ? undefined : min * 100,
    maxPriceCents: max === undefined ? undefined : max * 100,
    minRating: rating >= 1 && rating <= 5 ? rating : undefined,
    inStockOnly: read(input, "stock") === "1" ? true : undefined,
    onSale: read(input, "sale") === "1" ? true : undefined,
    sort: sort && SORT_KEYS.includes(sort) ? sort : "featured",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Query to URL. Defaults are omitted so URLs stay short and canonical. */
export function toSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.text) params.set("k", query.text);
  if (query.categorySlug) params.set("c", query.categorySlug);
  if (query.minPriceCents !== undefined) params.set("min", String(Math.round(query.minPriceCents / 100)));
  if (query.maxPriceCents !== undefined) params.set("max", String(Math.round(query.maxPriceCents / 100)));
  if (query.minRating !== undefined) params.set("r", String(query.minRating));
  if (query.inStockOnly) params.set("stock", "1");
  if (query.onSale) params.set("sale", "1");
  if (query.sort !== "featured") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}
