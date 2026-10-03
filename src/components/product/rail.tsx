import Link from "next/link";
import type { ProductSummary } from "@/modules/search";
import { ProductGrid } from "./product-grid";

/** A titled row of products with a real source (search, deals, history, recommendations). Renders nothing when empty. */
export function Rail({
  id,
  title,
  subtitle,
  href,
  products,
  sponsored = false,
}: {
  sponsored?: boolean;
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  products: ProductSummary[];
}) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={`rail-${id}`} className="space-y-6" data-testid={`rail-${id}`}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 id={`rail-${id}`} className="text-2xl leading-8 font-semibold tracking-[-0.015em]">
            {title}
          </h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:text-muted-foreground">
            View all
          </Link>
        ) : null}
      </div>
      <ProductGrid products={products} sponsored={sponsored} />
    </section>
  );
}
