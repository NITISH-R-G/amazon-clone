import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { AppliedFilters } from "@/components/search/applied-filters";
import { FilterControls } from "@/components/search/filter-controls";
import { MobileFilters } from "@/components/search/mobile-filters";
import { ResultsPagination } from "@/components/search/results-pagination";
import { SortControl } from "@/components/search/sort-control";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { parseSearchParams } from "@/modules/search";
import { getApp } from "@/server/runtime";

export async function generateMetadata({ searchParams }: PageProps<"/s">): Promise<Metadata> {
  const q = parseSearchParams(await searchParams);
  return { title: q.text ? `Results for "${q.text}"` : "All products" };
}

export default async function ResultsPage({ searchParams }: PageProps<"/s">) {
  const query = parseSearchParams(await searchParams);
  const app = await getApp();
  const result = await app.search.searchProducts(query);
  const allCategories = result.items.length === 0 ? await app.catalog.listCategories() : [];

  const categoryName = result.facets.categories.find((c) => c.slug === query.categorySlug)?.name;
  const heading = query.text ? `Results for "${query.text}"` : (categoryName ?? (query.onSale ? "On sale" : "All products"));
  const activeCount = [
    query.categorySlug,
    query.minPriceCents !== undefined || query.maxPriceCents !== undefined,
    query.minRating,
    query.inStockOnly,
    query.onSale,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">{heading}</h1>
          <p className="num mt-1 text-sm text-muted-foreground" role="status">
            {result.total} {result.total === 1 ? "product" : "products"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MobileFilters categories={result.facets.categories} total={result.total} activeCount={activeCount} />
          <SortControl value={query.sort} />
        </div>
      </div>

      <AppliedFilters query={query} categoryName={categoryName} />

      <div className="grid gap-10 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside aria-label="Filters" className="hidden lg:block">
          <FilterControls categories={result.facets.categories} />
        </aside>
        <div>
          {result.relaxed && result.items.length > 0 ? (
            <p role="status" className="mb-6 rounded-lg bg-muted px-4 py-3 text-sm">
              No product matches every word in &ldquo;{query.text}&rdquo;. Showing products that match some of them.
            </p>
          ) : null}
          {result.items.length > 0 ? (
            <>
              <ProductGrid products={result.items} dense />
              <ResultsPagination query={query} page={result.page} pageCount={result.pageCount} />
            </>
          ) : (
            <Empty className="border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-semibold">
                  {query.text ? `No products match “${query.text}”` : "No products match these filters"}
                </EmptyTitle>
                <EmptyDescription>
                  {activeCount > 0
                    ? "Remove a filter, or clear them all to see more."
                    : "Check the spelling, or try a more general word."}
                </EmptyDescription>
              </EmptyHeader>
              <div className="flex flex-wrap justify-center gap-2">
                {activeCount > 0 ? (
                  <Button asChild>
                    <Link href={query.text ? `/s?k=${encodeURIComponent(query.text)}` : "/s"}>Clear all filters</Link>
                  </Button>
                ) : null}
                {allCategories.map((c) => (
                  <Button key={c.slug} asChild variant="outline">
                    <Link href={`/s?c=${c.slug}`}>{c.name}</Link>
                  </Button>
                ))}
              </div>
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}
