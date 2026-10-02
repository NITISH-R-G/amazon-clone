import { count } from "drizzle-orm";
import { attributeDefs, categories, offers, productTypes, products, sellers, variants } from "@/db/schema";
import type { Database } from "@/server/app";
import {
  CATALOG_SIZE,
  EXTRA_CATEGORIES,
  SELLERS,
  mulberry32,
  offersFor,
  type SeedOffer,
  TYPE_DEFS,
  curatedFacts,
  curatedVariantTones,
  generateCatalog,
  slugify,
  type SeedProduct,
} from "./catalog/generate";
import catalog from "./demo-catalog.json";

/**
 * The synthetic demo catalogue (decisions D23, D25): 30 curated products (src/db/demo-catalog.json, these carry
 * the featured rails) plus a deterministic generated remainder (src/db/catalog/). Invented brands, our own
 * flat illustrations (scripts/generate-product-art.mjs), no Amazon data or identifiers; ratings and review
 * counts are demo values. Idempotent: seeds only an empty catalogue.
 */
type Row = typeof products.$inferInsert;
type VariantRow = typeof variants.$inferInsert;
type OfferRow = typeof offers.$inferInsert;
type Image = { url: string; alt: string };

const BATCH = 200;

const sellerId = (name: string) => `seller-${slugify(name)}`;

function offerRows(variantId: string, list: SeedOffer[]): OfferRow[] {
  return list.map((o, i) => ({
    id: `offer-${variantId}-${i + 1}`,
    variantId,
    sellerId: sellerId(o.seller),
    priceCents: o.priceCents,
    listPriceCents: o.listPriceCents,
    shippingCents: o.shippingCents,
    handlingMinutes: o.handlingMinutes,
    fulfilment: o.fulfilment,
    stock: o.stock,
  }));
}

// Curated products that show off competing sellers on the home rails and in the demo walkthrough.
const CURATED_WITH_OFFERS = new Set(["studio-headphones", "linden-ceramic-pour-over-set", "ember-stoneware-mug-2-pack", "everyday-backpack", "field-watch"]);

const pictures = (shape: string, tone: number, alt: string): Image[] => [
  { url: `/products/${shape}-${tone}-1.svg`, alt },
  { url: `/products/${shape}-${tone}-2.svg`, alt: `${alt}, detail view` },
];

function curatedProduct(p: (typeof catalog.products)[number], categoryId: Map<string, string>) {
  const productId = `prod-${p.slug}`;
  const facts = curatedFacts(p);
  const optionKey = "optionName" in p && p.optionName ? slugify(p.optionName).replace(/-/g, "_") : null;
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
    typeId: facts ? `type-${facts.typeSlug}` : null,
    attributes: facts?.attributes ?? {},
    ratingTenths: p.rating,
    ratingCount: p.count,
    featuredRank: "rank" in p ? p.rank : null,
    createdAt: new Date(`${p.created}T09:00:00Z`),
    bullets: p.bullets,
    specs: facts?.specs ?? [],
    optionName: "optionName" in p ? p.optionName : null,
  };
  const options = "variants" in p && p.variants ? p.variants : null;
  const tones = options && optionKey ? curatedVariantTones(options, optionKey, p.tone) : [];
  const rows: VariantRow[] = options
    ? options.map((v, i) => ({
        id: v.id,
        productId,
        label: v.label,
        sku: `SKU-${v.id.toUpperCase()}`,
        selections: optionKey ? { [optionKey]: v.label } : {},
        images: optionKey === "color" ? pictures(p.shape, tones[i], `${p.title} (${v.label})`) : [],
        priceCents: v.price,
        listPriceCents: null,
        stock: v.stock,
      }))
    : [
        {
          id: "variantId" in p && p.variantId ? p.variantId : `var-${p.slug}`,
          productId,
          label: null,
          sku: `SKU-${p.slug.toUpperCase()}`,
          selections: {},
          images: [],
          priceCents: p.price,
          listPriceCents: "list" in p ? p.list : null,
          stock: p.stock,
        },
      ];
  const rng = mulberry32(4242);
  const extra = CURATED_WITH_OFFERS.has(p.slug) ? rows.flatMap((v) => offerRows(v.id as string, offersFor(rng, v.priceCents))) : [];
  return { product, variants: rows, offers: extra };
}

function generatedProduct(p: SeedProduct, categoryId: Map<string, string>) {
  const productId = `prod-${p.slug}`;
  const first = p.variants[0];
  const product: Row = {
    id: productId,
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    description: p.description,
    images: pictures(p.shape, first.tone, p.title),
    categoryId: categoryId.get(p.category) ?? null,
    typeId: `type-${p.typeSlug}`,
    attributes: p.attributes,
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
    sku: v.sku,
    selections: v.selections,
    // Only colours change the picture; other dimensions share the product's.
    images: v.selections.color ? pictures(p.shape, v.tone, `${p.title} (${v.label})`) : [],
    priceCents: v.price,
    listPriceCents: v.list,
    stock: v.stock,
  }));
  const extra = p.variants.flatMap((v) => offerRows(v.id, v.offers));
  return { product, variants: rows, offers: extra };
}

export async function seedDemoCatalog(db: Database) {
  const [{ value }] = await db.select({ value: count() }).from(products);
  if (value > 0) return;

  const allCategories = [...catalog.categories, ...EXTRA_CATEGORIES];
  const categoryId = new Map(allCategories.map((c) => [c.slug, c.id]));
  const built = [
    ...catalog.products.map((p) => curatedProduct(p, categoryId)),
    ...generateCatalog().map((p) => generatedProduct(p, categoryId)),
  ];
  if (built.length !== CATALOG_SIZE) throw new Error(`catalogue has ${built.length} products, expected ${CATALOG_SIZE}`);

  // One transaction, batched inserts: a partial catalogue is never left behind.
  await db.transaction(async (tx) => {
    await tx.insert(categories).values(allCategories);
    await tx.insert(productTypes).values(
      TYPE_DEFS.map((t, position) => ({
        id: `type-${t.slug}`,
        slug: t.slug,
        name: t.name,
        categoryId: categoryId.get(t.category) as string,
        position,
      })),
    );
    await tx.insert(attributeDefs).values(
      TYPE_DEFS.flatMap((t) =>
        t.attrs.map((a, position) => ({
          id: `type-${t.slug}:${a.key}`,
          typeId: `type-${t.slug}`,
          key: a.key,
          label: a.label,
          role: a.role,
          facet: a.facet,
          values: a.values,
          position,
        })),
      ),
    );
    await tx.insert(sellers).values(SELLERS.map((name) => ({ id: sellerId(name), name })));
    for (let i = 0; i < built.length; i += BATCH) {
      const slice = built.slice(i, i + BATCH);
      await tx.insert(products).values(slice.map((b) => b.product));
      await tx.insert(variants).values(slice.flatMap((b) => b.variants));
      const extra = slice.flatMap((b) => b.offers);
      if (extra.length > 0) await tx.insert(offers).values(extra);
    }
  });
}
