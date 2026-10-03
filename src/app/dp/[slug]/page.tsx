import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Rail } from "@/components/product/rail";
import { ReviewsSection } from "@/components/product/reviews-section";
import { ViewTracker } from "@/components/product/view-tracker";
import { PurchaseGallery } from "@/components/product/purchase-gallery";
import { ProductSpecs } from "@/components/product/product-specs";
import { LivePrice, PurchaseProvider } from "@/components/product/purchase-context";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { RatingStars } from "@/components/product/rating-stars";
import { formatUsd } from "@/lib/money";
import { FLAT_SHIPPING_CENTS, FREE_SHIPPING_THRESHOLD_CENTS } from "@/modules/checkout";
import { getApp } from "@/server/runtime";
import { readActor, readUser } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/dp/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await (await getApp()).catalog.getProduct(slug);
  return { title: product?.title ?? "Product not found" };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/dp/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const app = await getApp();
  const product = await app.catalog.getProduct(slug);
  if (!product || product.variants.length === 0) notFound();

  const category = (await app.catalog.listCategories()).find((c) => c.id === product.categoryId);
  const type = product.typeId ? await app.catalog.getType(product.typeId) : null;
  const defs = (type?.attributes ?? []).filter((a) => a.role === "variation").map((a) => ({ key: a.key, label: a.label, values: a.values }));
  const offerMap = await app.catalog.listOffers(product.variants.map((v) => v.id));
  const firstPartyShipping = (priceCents: number) => (priceCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS);
  const variants = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    label: v.label,
    selections: v.selections,
    images: v.images,
    priceCents: v.priceCents,
    listPriceCents: v.listPriceCents && v.listPriceCents > v.priceCents ? v.listPriceCents : null,
    stock: v.stock,
    // The first-party offer is the variant itself; seller offers come after it.
    offers: [
      {
        offerId: null,
        sellerName: "Cartly",
        fulfilment: "cartly" as const,
        priceCents: v.priceCents,
        listPriceCents: v.listPriceCents && v.listPriceCents > v.priceCents ? v.listPriceCents : null,
        shippingCents: firstPartyShipping(v.priceCents),
        handlingMinutes: 0,
        stock: v.stock,
      },
      ...(offerMap[v.id] ?? []),
    ],
  }));
  const [actor, user] = await Promise.all([readActor(), readUser()]);
  const [reviewSummary, reviewList, eligibility] = await Promise.all([
    app.reviews.summary(product.id),
    app.reviews.list(product.id, 6),
    user ? app.reviews.eligibility(user.id, product.id, product.slug) : null,
  ]);
  const [related, viewed, forYou] = await Promise.all([
    app.discovery.relatedTo(product.id, 4),
    app.discovery.recentlyViewed(actor, 6, product.id),
    app.discovery.forYou(actor, 8),
  ]);
  const relatedIds = new Set(related.map((p) => p.id));
  const alsoLike = forYou.filter((p) => p.id !== product.id && !relatedIds.has(p.id)).slice(0, 4);
  const deliveryEstimate = new Date().toISOString();
  const shippingNote = `Free shipping on orders over ${formatUsd(FREE_SHIPPING_THRESHOLD_CENTS)}, otherwise ${formatUsd(FLAT_SHIPPING_CENTS)}.${app.payments.provider.kind === "demo" ? " Payment is simulated in this demo." : " Payments run in Stripe test mode."}`;

  return (
    <PurchaseProvider variants={variants} defs={defs} productImages={product.images} initialSku={typeof sp.sku === "string" ? sp.sku : undefined}>
    <article className="grid gap-x-12 gap-y-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_21rem] xl:gap-x-14">
      {/* DOM order is the mobile order: gallery, title and price, purchase options, then the details. */}
      <div className="lg:row-span-2 xl:col-start-1 xl:row-span-2 xl:row-start-1">
        <PurchaseGallery />
      </div>

      <div className="space-y-6 lg:col-start-2 lg:row-start-1 xl:col-start-2">
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
          {product.ratingCount > 0 ? (
            <a href="#reviews" className="inline-block hover:underline">
              <RatingStars rating={product.rating} count={product.ratingCount} />
            </a>
          ) : null}
        </div>
        <LivePrice className="xl:hidden" />
      </div>

      <aside
        aria-label="Purchase"
        className="lg:col-start-2 lg:row-start-2 xl:sticky xl:top-6 xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:self-start"
      >
        <PurchasePanel title={product.title} shippingNote={shippingNote} deliveryEstimate={deliveryEstimate} />
      </aside>

      <div className="space-y-6 border-t pt-8 lg:col-span-2 lg:row-start-3 xl:col-span-1 xl:col-start-2 xl:row-start-2 xl:border-t-0 xl:pt-0">
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
    </article>
    <ReviewsSection slug={product.slug} summary={reviewSummary} reviews={reviewList} canReview={Boolean(eligibility?.ok)} />
    <div className="mt-20 space-y-16 border-t pt-10">
      <Rail id="related" title="Related products" subtitle="Similar products, ranked by type, brand, price and rating" href={category ? `/s?c=${category.slug}&sort=rating` : undefined} products={related} />
      <Rail id="based-on-views" title="Based on your recent views" products={alsoLike} />
      <Rail id="recently-viewed" title="Recently viewed" products={viewed} />
    </div>
    <ViewTracker productId={product.id} />
    </PurchaseProvider>
  );
}
