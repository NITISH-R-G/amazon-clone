import type { ProductSummary } from "@/modules/search";
import { ProductCard } from "./product-card";

/** Responsive product grid: 2 columns on phones, then 3 and 4 as space allows. */
export function ProductGrid({ products, dense = false, sponsored = false }: { products: ProductSummary[]; dense?: boolean; sponsored?: boolean }) {
  return (
    <ul
      className={
        dense
          ? "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 xl:grid-cols-4"
          : "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4"
      }
    >
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 4} sponsored={sponsored} />
        </li>
      ))}
    </ul>
  );
}
