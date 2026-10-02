"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt: string };

/** Thumbnail strip + large image. Thumbnails are buttons (keyboard and touch), the large image cross-fades. */
export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  if (!current) {
    return <div className="aspect-square rounded-xl bg-muted" role="img" aria-label="No image available" />;
  }
  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {images.map((image, i) => (
          <Image
            key={image.url}
            src={image.url}
            alt={i === index ? image.alt : ""}
            aria-hidden={i === index ? undefined : true}
            fill
            priority={i === 0}
            unoptimized
            sizes="(min-width: 1280px) 40vw, (min-width: 768px) 55vw, 100vw"
            className={cn(
              "object-contain p-8 transition-opacity duration-200 ease-out",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />
        ))}
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2 md:flex-col" aria-label="Product images">
          {images.map((image, i) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={cn(
                  "relative size-14 overflow-hidden rounded-lg border bg-muted transition-colors duration-150 md:size-16",
                  i === index ? "border-foreground" : "border-transparent hover:border-input",
                )}
              >
                <Image src={image.url} alt="" fill unoptimized sizes="64px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
