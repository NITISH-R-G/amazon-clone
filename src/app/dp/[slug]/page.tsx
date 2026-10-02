import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductSpecs } from "@/components/product/product-specs";
import { LivePrice, PurchaseProvider } from "@/components/product/purchase-context";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { RatingStars } from "@/components/product/rating-stars";
import { Separator } from "@/components/ui/separator";
import { formatUsd } from "@/lib/money";
import { availabilityState } from "@/modules/catalog";
import { FLAT_SHIPPING_CENTS, FREE_SHIPPING_THRESHOLD_CENTS } from "@/modules/checkout";
import { estimatedDeliveryFrom } from "@/modules/orders";
import { getApp } from "@/server/runtime";

export async function generateMetadata({ params }: PageProps<"/dp/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await (await getApp()).catalog.getProduct(slug);
  return { title: product?.title ?? "Product not found" };
}

export default async function ProductPage({ params }: PageProps<"/dp/[slug]">) {
  const { slug } = await params;
  const app = await getApp();
  const product = await app.catalog.getProduct(slug);
  if (!product || product.variants.length === 0) notFound();

  const category = (await app.catalog.listCategories()).find((c) => c.id === product.categoryId);
  const variants = product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceCents: v.priceCents,
    listPriceCents: v.listPriceCents && v.listPriceCents > v.priceCents ? v.listPriceCents : null,
    stock: v.stock,
    state: availabilityState(v.stock),
  }));
  // Related: the best-rated products of the same department, without this one.
  const related = category
    ? (await app.search.searchProducts({ categorySlug: category.slug, sort: "rating", pageSize: 5 })).items
        .filter((p) => p.slug !== product.slug)
        .slice(0, 4)
    : [];
  const deliveryEstimate = estimatedDeliveryFrom(new Date()).toISOString();
  const shippingNote = `Free shipping on orders over ${formatUsd(FREE_SHIPPING_THRESHOLD_CENTS)}, otherwise ${formatUsd(FLAT_SHIPPING_CENTS)}. Payment is simulated in this demo.`;

  return (
    <PurchaseProvider variants={variants}>
    <article className="grid gap-x-12 gap-y-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_21rem] xl:gap-x-14">
      <div className="lg:row-span-2 xl:row-span-1">
        <ProductGallery images={product.images} />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {category ? (
              <Link href={`/s?c=${category.slug}`} className="hover:text-foreground hover:underline">
                {category.name}
              </Link>
            ) : null}
            {category ? <span aria-hidden="true"> / </span> : null}
            {product.brand}
          </p>
          <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-[38px]">{product.title}</h1>
          {product.ratingCount > 0 ? <RatingStars rating={product.rating} count={product.ratingCount} /> : null}
        </div>

        <LivePrice className="xl:hidden" />
        <Separator />
        <p className="leading-7">{product.description}</p>
        {product.bullets.length > 0 ? (
          <section aria-labelledby="highlights" className="space-y-2">
            <h2 id="highlights" className="text-sm font-semibold">
              Highlights
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-6 marker:text-muted-foreground">
              {product.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <ProductSpecs specs={product.specs} />
      </div>

      <aside aria-label="Purchase" className="lg:border-t lg:pt-8 xl:sticky xl:top-6 xl:self-start xl:border-t-0 xl:pt-0">
        <PurchasePanel title={product.title} optionName={product.optionName} shippingNote={shippingNote} deliveryEstimate={deliveryEstimate} />
      </aside>
    </article>
    {related.length > 0 ? (
      <section aria-labelledby="related" className="mt-20 space-y-6 border-t pt-10">
        <div className="flex items-end justify-between gap-4">
          <h2 id="related" className="text-xl font-semibold tracking-[-0.01em]">
            More in {category?.name}
          </h2>
          <Link href={`/s?c=${category?.slug}&sort=rating`} className="flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:text-muted-foreground">
            View all
          </Link>
        </div>
        <ProductGrid products={related} />
      </section>
    ) : null}
    </PurchaseProvider>
  );
}
