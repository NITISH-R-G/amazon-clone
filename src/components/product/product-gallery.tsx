"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt: string };

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  if (!current) {
    return <div className="aspect-square rounded-lg bg-muted" role="img" aria-label="No image available" />;
  }
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 ? (
        <ul className="flex gap-2 sm:flex-col" aria-label="Product images">
          {images.map((image, i) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={cn(
                  "size-16 overflow-hidden rounded-md border bg-muted outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring",
                  i === index ? "border-ring ring-1 ring-ring" : "border-border",
                )}
              >
                <Image src={image.url} alt="" width={64} height={64} unoptimized className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
        <Image src={current.url} alt={current.alt} fill priority unoptimized sizes="(min-width: 1024px) 40vw, 100vw" className="object-contain" />
      </div>
    </div>
  );
}
