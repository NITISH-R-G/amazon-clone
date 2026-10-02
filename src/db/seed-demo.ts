import { count } from "drizzle-orm";
import { categories, products, variants } from "@/db/schema";
import type { Database } from "@/server/app";
import catalog from "./demo-catalog.json";

/**
 * Our own demo catalogue (src/db/demo-catalog.json): invented brands, our own
 * flat illustrations (scripts/generate-product-art.mjs), no Amazon data or
 * identifiers. Ratings and counts are demo values. Idempotent: seeds only an empty catalogue.
 */
export async function seedDemoCatalog(db: Database) {
  const [{ value }] = await db.select({ value: count() }).from(products);
  if (value > 0) return;

  await db.insert(categories).values(catalog.categories);
  const categoryId = new Map(catalog.categories.map((c) => [c.slug, c.id]));

  for (const p of catalog.products) {
    const productId = `prod-${p.slug}`;
    await db.insert(products).values({
      id: productId,
      slug: p.slug,
      title: p.title,
      brand: p.brand,
      description: p.description,
      images: [
        { url: `/products/${p.slug}-1.svg`, alt: p.title },
        { url: `/products/${p.slug}-2.svg`, alt: `${p.title}, detail view` },
      ],
      categoryId: categoryId.get(p.category) ?? null,
      ratingTenths: p.rating,
      ratingCount: p.count,
      featuredRank: "rank" in p ? p.rank : null,
      createdAt: new Date(`${p.created}T09:00:00Z`),
      bullets: p.bullets,
      optionName: "optionName" in p ? p.optionName : null,
    });
    const rows =
      "variants" in p && p.variants
        ? p.variants.map((v) => ({
            id: v.id,
            productId,
            label: v.label,
            priceCents: v.price,
            listPriceCents: null,
            stock: v.stock,
          }))
        : [
            {
              id: "variantId" in p && p.variantId ? p.variantId : `var-${p.slug}`,
              productId,
              label: null,
              priceCents: p.price,
              listPriceCents: "list" in p ? p.list : null,
              stock: p.stock,
            },
          ];
    await db.insert(variants).values(rows);
  }
}
