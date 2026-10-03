"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/app/discovery-actions";

/** Renders nothing: records that this product was looked at, once per page view. */
export function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    void recordViewAction(productId).catch(() => {});
  }, [productId]);
  return null;
}
