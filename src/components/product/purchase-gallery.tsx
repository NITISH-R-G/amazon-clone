"use client";

import { ProductGallery } from "./product-gallery";
import { usePurchase } from "./purchase-context";

/** The gallery of the selected variant: choosing a colour changes the pictures. */
export function PurchaseGallery() {
  const { images } = usePurchase();
  // Re-mount when the pictures change so the thumbnail selection starts again from the first one.
  return <ProductGallery key={images[0]?.url} images={images} />;
}
