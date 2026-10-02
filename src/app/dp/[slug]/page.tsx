import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/product/add-to-cart-form";
import { PriceBlock } from "@/components/product/price-block";
import { ProductGallery } from "@/components/product/product-gallery";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  if (!product) notFound();
  const variant = product.variants[0];
  if (!variant) notFound();

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_20rem]">
      <ProductGallery images={product.images} />

      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{product.brand}</p>
          <h1 className="text-2xl font-bold leading-tight">{product.title}</h1>
        </div>
        <Separator />
        <PriceBlock cents={variant.priceCents} listCents={variant.listPriceCents} size="lg" />
        <Separator />
        <section aria-labelledby="about">
          <h2 id="about" className="mb-2 font-bold">
            About this item
          </h2>
          <p className="text-sm leading-relaxed">{product.description}</p>
        </section>
      </div>

      <Card className="h-fit space-y-4 p-4 lg:sticky lg:top-4">
        <PriceBlock cents={variant.priceCents} size="lg" />
        <AddToCartForm variantId={variant.id} stock={variant.stock} />
      </Card>
    </article>
  );
}
