import { count } from "drizzle-orm";
import { categories, products, variants } from "@/db/schema";
import type { Database } from "@/server/app";
import { CATALOG_SIZE, generateCatalog, specsForCurated, type SeedProduct } from "./catalog/generate";
import catalog from "./demo-catalog.json";

/**
 * The synthetic demo catalogue (decision D23): 30 curated products (src/db/demo-catalog.json, these carry
 * the featured rails) plus a deterministic generated remainder (src/db/catalog/). Invented brands, our own
 * flat illustrations (scripts/generate-product-art.mjs), no Amazon data or identifiers; ratings and review
 * counts are demo values. Idempotent: seeds only an empty catalogue.
 */
type Row = typeof products.$inferInsert;
type VariantRow = typeof variants.$inferInsert;

const BATCH = 400;

function curatedProduct(p: (typeof catalog.products)[number], categoryId: Map<string, string>) {
  const productId = `prod-${p.slug}`;
  const product: Row = {
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
    specs: specsForCurated(p),
    optionName: "optionName" in p ? p.optionName : null,
  };
  const rows: VariantRow[] =
    "variants" in p && p.variants
      ? p.variants.map((v) => ({ id: v.id, productId, label: v.label, priceCents: v.price, listPriceCents: null, stock: v.stock }))
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
  return { product, variants: rows };
}

function generatedProduct(p: SeedProduct, categoryId: Map<string, string>) {
  const productId = `prod-${p.slug}`;
  const image = (view: 1 | 2) => `/products/${p.shape}-${p.tone}-${view}.svg`;
  const product: Row = {
    id: productId,
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    description: p.description,
    images: [
      { url: image(1), alt: p.title },
      { url: image(2), alt: `${p.title}, detail view` },
    ],
    categoryId: categoryId.get(p.category) ?? null,
    ratingTenths: p.rating,
    ratingCount: p.count,
    featuredRank: null,
    createdAt: new Date(`${p.created}T09:00:00Z`),
    bullets: p.bullets,
    specs: p.specs,
    optionName: p.optionName,
  };
  const rows: VariantRow[] = p.variants.map((v) => ({
    id: v.id,
    productId,
    label: v.label,
    priceCents: v.price,
    listPriceCents: v.list,
    stock: v.stock,
  }));
  return { product, variants: rows };
}

export async function seedDemoCatalog(db: Database) {
  const [{ value }] = await db.select({ value: count() }).from(products);
  if (value > 0) return;

  const categoryId = new Map(catalog.categories.map((c) => [c.slug, c.id]));
  const built = [
    ...catalog.products.map((p) => curatedProduct(p, categoryId)),
    ...generateCatalog().map((p) => generatedProduct(p, categoryId)),
  ];
  if (built.length !== CATALOG_SIZE) throw new Error(`catalogue has ${built.length} products, expected ${CATALOG_SIZE}`);

  // One transaction, batched inserts: a partial catalogue is never left behind.
  await db.transaction(async (tx) => {
    await tx.insert(categories).values(catalog.categories);
    for (let i = 0; i < built.length; i += BATCH) {
      const slice = built.slice(i, i + BATCH);
      await tx.insert(products).values(slice.map((b) => b.product));
      await tx.insert(variants).values(slice.flatMap((b) => b.variants));
    }
  });
}
