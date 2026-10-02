import type { Database } from "@/server/app";
import { categories, offers, products, sellers, variants } from "@/db/schema";

/** Test fixtures per docs/tracer-bullet.md. Inserted directly; not a mock. */
export async function seedFixtures(db: Database) {
  await db.insert(categories).values([
    { id: "cat-kitchen", slug: "kitchen", name: "Kitchen", position: 1 },
    { id: "cat-home", slug: "home", name: "Home", position: 2 },
  ]);
  await db.insert(products).values([
    {
      id: "prod-kettle",
      slug: "test-kettle",
      title: "Test Kettle",
      brand: "Testco",
      description: "A kettle for tests.",
      images: [{ url: "/products/kettle.svg", alt: "Test Kettle" }],
      categoryId: "cat-kitchen",
      ratingTenths: 45,
      ratingCount: 120,
      bullets: ["Boils in minutes"],
    },
    {
      id: "prod-mug",
      slug: "test-mug",
      title: "Test Mug",
      brand: "Testco",
      description: "A mug for tests.",
      images: [{ url: "/products/mug.svg", alt: "Test Mug" }],
      categoryId: "cat-kitchen",
    },
  ]);
  await db.insert(variants).values([
    { id: "var-kettle", productId: "prod-kettle", priceCents: 2999, stock: 5 },
    { id: "var-mug", productId: "prod-mug", label: "Speckled, 350 ml", sku: "SKU-MUG-SPK-350", selections: { finish: "Speckled", capacity: "350 ml" }, priceCents: 1200, stock: 1 },
  ]);
  // Two marketplace offers on the kettle: a cheaper one with its own shipping and handling time, and a sold-out one.
  await db.insert(sellers).values([
    { id: "seller-nw", name: "Northwind Supply" },
    { id: "seller-bw", name: "Birchwood Direct" },
  ]);
  await db.insert(offers).values([
    { id: "offer-kettle-nw", variantId: "var-kettle", sellerId: "seller-nw", priceCents: 2699, shippingCents: 399, handlingMinutes: 180, fulfilment: "seller", stock: 3 },
    { id: "offer-kettle-bw", variantId: "var-kettle", sellerId: "seller-bw", priceCents: 3199, shippingCents: 0, handlingMinutes: 60, fulfilment: "seller", stock: 0 },
  ]);
}
