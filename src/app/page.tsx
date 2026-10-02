import Image from "next/image";
import Link from "next/link";
import { PriceBlock } from "@/components/product/price-block";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { getApp } from "@/server/runtime";

function Rail({ title, href, products }: { title: string; href: string; products: Parameters<typeof ProductGrid>[0]["products"] }) {
  return (
    <section aria-labelledby={`rail-${title}`} className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`rail-${title}`} className="text-2xl leading-8 font-semibold tracking-[-0.015em]">
          {title}
        </h2>
        <Link href={href} className="flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:text-muted-foreground">
          View all
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}

export default async function HomePage() {
  const app = await getApp();
  const [featured, sale, newest] = await Promise.all([
    app.search.searchProducts({ sort: "featured", pageSize: 4 }),
    app.search.searchProducts({ onSale: true, sort: "rating", pageSize: 4 }),
    app.search.searchProducts({ sort: "newest", pageSize: 4 }),
  ]);
  const hero = featured.items[0];

  return (
    <div className="space-y-20 lg:space-y-28">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="space-y-6">
          <h1 className="text-[40px] leading-[44px] font-semibold tracking-[-0.025em] sm:text-[52px] sm:leading-[56px]">
            Everyday objects, well made.
          </h1>
          <p className="max-w-md text-lg leading-7 text-muted-foreground">
            A small, carefully chosen range of audio, kitchen, home, desk, travel and wearable essentials.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/s">Shop all products</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/s?sale=1">On sale</Link>
            </Button>
          </div>
        </div>
        {hero ? (
          <Link href={`/dp/${hero.slug}`} className="group block rounded-xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:aspect-[5/4]">
              {hero.imageUrl ? (
                <Image src={hero.imageUrl} alt={hero.imageAlt} fill priority unoptimized sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-10 transition-transform duration-300 ease-out group-hover:scale-[1.03]" />
              ) : null}
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-4">
              <p className="text-[15px] font-medium">{hero.title}</p>
              <PriceBlock cents={hero.priceCents} listCents={hero.listPriceCents} size="sm" />
            </div>
          </Link>
        ) : null}
      </section>

      <section aria-labelledby="shop-by-category" className="space-y-6">
        <h2 id="shop-by-category" className="text-2xl leading-8 font-semibold tracking-[-0.015em]">
          Shop by category
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {featured.facets.categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/s?c=${c.slug}`}
                className="flex min-h-24 flex-col justify-between rounded-xl bg-muted p-4 transition-colors duration-150 hover:bg-accent"
              >
                <span className="text-base font-semibold">{c.name}</span>
                <span className="num text-sm text-muted-foreground">{c.count} products</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Rail title="Featured" href="/s" products={featured.items} />
      <Rail title="On sale" href="/s?sale=1" products={sale.items} />
      <Rail title="New arrivals" href="/s?sort=newest" products={newest.items} />
    </div>
  );
}
