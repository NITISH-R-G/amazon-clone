import type { Database } from "@/server/app";
import { products, variants } from "@/db/schema";

/** Test fixtures per docs/tracer-bullet.md. Inserted directly; not a mock. */
export async function seedFixtures(db: Database) {
  await db.insert(products).values([
    {
      id: "prod-kettle",
      slug: "test-kettle",
      title: "Test Kettle",
      brand: "Testco",
      description: "A kettle for tests.",
      images: [{ url: "/products/kettle.svg", alt: "Test Kettle" }],
    },
    {
      id: "prod-mug",
      slug: "test-mug",
      title: "Test Mug",
      brand: "Testco",
      description: "A mug for tests.",
      images: [{ url: "/products/mug.svg", alt: "Test Mug" }],
    },
  ]);
  await db.insert(variants).values([
    { id: "var-kettle", productId: "prod-kettle", priceCents: 2999, stock: 5 },
    { id: "var-mug", productId: "prod-mug", priceCents: 1200, stock: 1 },
  ]);
}
