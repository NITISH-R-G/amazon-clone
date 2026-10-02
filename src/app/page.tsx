import Image from "next/image";
import Link from "next/link";
import { PriceBlock } from "@/components/product/price-block";
import { Card } from "@/components/ui/card";
import { getApp } from "@/server/runtime";

// TEMPORARY tracer index: lists the seeded products so the purchase path can be
// reached. Replaced by the real home page in slice A2.
export default async function TracerIndex() {
  const app = await getApp();
  const products = await app.catalog.listProducts();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Shop</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const v = p.variants[0];
          return (
            <li key={p.id}>
              <Card className="h-full overflow-hidden p-0 transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
                <Link href={`/dp/${p.slug}`} className="block outline-none">
                  <div className="relative aspect-square bg-muted">
                    {p.images[0] ? (
                      <Image src={p.images[0].url} alt={p.images[0].alt} fill unoptimized className="object-contain" />
                    ) : null}
                  </div>
                  <div className="space-y-1 p-4">
                    <h2 className="line-clamp-2 font-medium">{p.title}</h2>
                    <p className="text-sm text-muted-foreground">{p.brand}</p>
                    {v ? <PriceBlock cents={v.priceCents} listCents={v.listPriceCents} /> : null}
                  </div>
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
