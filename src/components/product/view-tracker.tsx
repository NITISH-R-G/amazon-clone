"use client";

import { useEffect } from "react";

/** Renders nothing: records that this product was looked at, once per page view. */
export function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    void fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
      keepalive: true,
    }).catch(() => {});
  }, [productId]);
  return null;
}
