import Image from "next/image";
import Link from "next/link";
import { PriceBlock } from "@/components/product/price-block";
import { Rail } from "@/components/product/rail";
import { Button } from "@/components/ui/button";
import { getApp } from "@/server/runtime";
import { readViewer } from "@/server/viewer";

export default async function HomePage() {
  const app = await getApp();
  const actor = await readViewer();
  const [featured, sale, trending, newest, viewed, forYou, ads] = await Promise.all([
    app.search.searchProducts({ sort: "featured", pageSize: 4 }),
    app.search.searchProducts({ onSale: true, sort: "rating", pageSize: 4 }),
    app.search.searchProducts({ sort: "rating", inStockOnly: true, pageSize: 4 }),
    app.search.searchProducts({ sort: "newest", pageSize: 4 }),
    app.discovery.recentlyViewed(actor, 4),
    app.discovery.forYou(actor, 4),
    app.discovery.sponsored({ placement: "home", limit: 4 }),
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

      {/* Personal rails come first when there is history; every rail has a real source and ranking. */}
      <Rail id="recently-viewed" title="Pick up where you left off" subtitle="Recently viewed" products={viewed} />
      <Rail id="for-you" title="Recommended for you" subtitle="Based on your recent views" products={forYou} />
      <Rail id="deals" title="Today's deals" subtitle="Biggest savings on in-stock products" href="/s?sale=1&sort=rating" products={sale.items} />
      <Rail id="trending" title="Top rated" subtitle="Best-rated products in stock" href="/s?sort=rating" products={trending.items} />
      <Rail id="sponsored" title="Sponsored" subtitle="Promoted by sellers. Organic ranking is unchanged." products={ads} sponsored />
      <Rail id="featured" title="Featured" href="/s" products={featured.items} />
      <Rail id="new" title="New arrivals" href="/s?sort=newest" products={newest.items} />
    </div>
  );
}
