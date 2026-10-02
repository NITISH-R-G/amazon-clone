import { count } from "drizzle-orm";
import { products, variants } from "@/db/schema";
import type { Database } from "@/server/app";

/**
 * Our own demo catalogue (no Amazon data or identifiers). Two products, enough
 * for the tracer: one under and one over the free-shipping threshold, one with
 * deliberately low stock to exercise stock validation. Idempotent.
 */
export async function seedDemoCatalog(db: Database) {
  const [{ value }] = await db.select({ value: count() }).from(products);
  if (value > 0) return;

  await db.insert(products).values([
    {
      id: "prod-pour-over",
      slug: "linden-ceramic-pour-over-set",
      title: "Linden Ceramic Pour-Over Coffee Set",
      brand: "Linden & Rye",
      description:
        "A matte ceramic dripper with a stainless drip tray and a 600 ml glazed carafe. The ribbed cone keeps the water in contact with the grounds for an even extraction, and the carafe is graduated so you can dose by eye. Dishwasher safe. Fits standard #2 cone filters (not included).",
      images: [
        { url: "/products/pour-over-1.svg", alt: "Matte white ceramic pour-over dripper sitting on a glass carafe" },
        { url: "/products/pour-over-2.svg", alt: "Overhead view of the ribbed dripper cone" },
      ],
    },
    {
      id: "prod-mug-set",
      slug: "ember-stoneware-mug-2-pack",
      title: "Ember Stoneware Mug, 2-Pack",
      brand: "Ember Studio",
      description:
        "Two 12 oz mugs thrown from speckled stoneware with a reactive glaze, so no two are exactly alike. A wide, comfortable handle and a thick rim hold heat. Microwave and dishwasher safe.",
      images: [
        { url: "/products/mug-1.svg", alt: "Two speckled terracotta stoneware mugs side by side" },
        { url: "/products/mug-2.svg", alt: "Close-up of a mug handle and glaze" },
      ],
    },
  ]);
  await db.insert(variants).values([
    { id: "var-pour-over", productId: "prod-pour-over", priceCents: 4200, listPriceCents: null, stock: 4 },
    { id: "var-mug-set", productId: "prod-mug-set", priceCents: 1899, listPriceCents: 2499, stock: 12 },
  ]);
}
