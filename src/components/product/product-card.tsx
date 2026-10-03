import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@/modules/search";
import { AvailabilityMessage } from "./availability-message";
import { PriceBlock } from "./price-block";
import { QuickAdd } from "./quick-add";
import { RatingStars } from "./rating-stars";

type Props = { product: ProductSummary; priority?: boolean; sponsored?: boolean };

/**
 * Image-first product card: no card chrome. The image, title, rating and price are one link;
 * the add action sits outside the link so interactive elements never nest.
 */
export function ProductCard({ product, priority = false, sponsored = false }: Props) {
  const { slug, title, imageUrl, imageAlt, priceCents, listPriceCents, rating, ratingCount, availability, singleVariantId } = product;
  return (
    <article className="group flex flex-col">
      <Link href={`/dp/${slug}`} className="flex flex-col gap-3 rounded-xl">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              unoptimized
              priority={priority}
              sizes="(min-width: 1280px) 22vw, (min-width: 640px) 30vw, 46vw"
              className="object-contain p-4 transition-transform duration-200 ease-out group-hover:scale-[1.03]"
            />
          ) : null}
        </div>
        <div className="space-y-1">
          {sponsored ? <p className="text-xs font-medium text-muted-foreground">Sponsored</p> : null}
          <h3 className="line-clamp-2 text-[15px] leading-5 font-medium">{title}</h3>
          {ratingCount > 0 ? <RatingStars rating={rating} count={ratingCount} /> : null}
          <PriceBlock cents={priceCents} listCents={listPriceCents} size="sm" />
        </div>
      </Link>
      <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
        <AvailabilityMessage state={availability} className="text-[13px]" />
        {singleVariantId ? <QuickAdd variantId={singleVariantId} title={title} /> : null}
      </div>
    </article>
  );
}
