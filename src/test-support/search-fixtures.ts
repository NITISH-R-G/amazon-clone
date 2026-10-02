import { categories, products, variants } from "@/db/schema";
import type { Database } from "@/server/app";

/** Extra catalogue rows for search tests (on top of the tracer fixtures). Inserted directly; not a mock. */
export async function seedSearchFixtures(db: Database) {
  await db.insert(categories).values([{ id: "cat-audio", slug: "audio", name: "Audio", position: 3 }]);
  const at = (iso: string) => new Date(iso);
  await db.insert(products).values([
    { id: "p-headphones", slug: "studio-headphones", title: "Studio Headphones", brand: "Orrin", description: "Closed-back studio headphones.", images: [{ url: "/p/h.svg", alt: "Headphones" }], categoryId: "cat-audio", ratingTenths: 46, ratingCount: 310, featuredRank: 1, createdAt: at("2026-09-20T00:00:00Z") },
    { id: "p-speaker", slug: "pocket-speaker", title: "Pocket Speaker", brand: "Orrin", description: "A small Bluetooth speaker.", images: [{ url: "/p/s.svg", alt: "Speaker" }], categoryId: "cat-audio", ratingTenths: 41, ratingCount: 88, featuredRank: 3, createdAt: at("2026-09-28T00:00:00Z") },
    { id: "p-throw", slug: "linen-throw", title: "Linen Throw", brand: "Veld", description: "A linen throw blanket.", images: [{ url: "/p/t.svg", alt: "Throw" }], categoryId: "cat-home", ratingTenths: 48, ratingCount: 40, featuredRank: null, createdAt: at("2026-08-01T00:00:00Z") },
    { id: "p-board", slug: "walnut-cutting-board", title: "Walnut Cutting Board", brand: "Veld", description: "A solid walnut board.", images: [{ url: "/p/b.svg", alt: "Board" }], categoryId: "cat-kitchen", ratingTenths: 44, ratingCount: 12, featuredRank: 2, createdAt: at("2026-09-01T00:00:00Z") },
    { id: "p-kettle-pro", slug: "ceramic-kettle-pro", title: "Ceramic Kettle Pro", brand: "Kestrel", description: "A ceramic kettle.", images: [{ url: "/p/k.svg", alt: "Kettle Pro" }], categoryId: "cat-kitchen", ratingTenths: 39, ratingCount: 500, featuredRank: null, createdAt: at("2026-07-01T00:00:00Z") },
  ]);
  await db.insert(variants).values([
    { id: "v-headphones", productId: "p-headphones", priceCents: 12900, listPriceCents: 14900, stock: 20 },
    { id: "v-speaker", productId: "p-speaker", priceCents: 4900, stock: 3 },
    { id: "v-throw", productId: "p-throw", priceCents: 6500, stock: 0 },
    { id: "v-board", productId: "p-board", priceCents: 3500, stock: 10 },
    { id: "v-kettle-pro", productId: "p-kettle-pro", priceCents: 8900, stock: 7 },
  ]);
}
