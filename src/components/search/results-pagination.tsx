import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toSearchParams, type SearchQuery } from "@/modules/search";

function pagesToShow(current: number, total: number): (number | "gap")[] {
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/** Numbered pagination; each link is a normal URL so pages are shareable and the back button works. */
export function ResultsPagination({ query, page, pageCount }: { query: SearchQuery; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const qs = toSearchParams({ ...query, page: p }).toString();
    return qs ? `/s?${qs}` : "/s";
  };
  return (
    <Pagination aria-label="Results pages" className="mt-12">
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious href={href(page - 1)} />
          </PaginationItem>
        ) : null}
        {pagesToShow(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <PaginationItem key={`gap-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={href(p)} isActive={p === page} aria-label={`Page ${p}`}>
                <span className="num">{p}</span>
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        {page < pageCount ? (
          <PaginationItem>
            <PaginationNext href={href(page + 1)} />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
