import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createSystemIds, systemClock } from "@/lib/ports";
import { createDemoProvider } from "@/modules/payments";
import { createApp } from "@/server/app";
import { seedDemoCatalog } from "./seed-demo";

describe("demo catalogue", () => {
  it("T34: seeds once, is searchable, and every product is purchasable data", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    await seedDemoCatalog(db);
    await seedDemoCatalog(db); // idempotent

    const ids = createSystemIds();
    const app = createApp({ db, clock: systemClock, ids, payments: createDemoProvider({ clock: systemClock, ids }) });

    const all = await app.search.searchProducts({ pageSize: 100 });
    expect(all.total).toBe(30);
    expect((await app.catalog.listCategories()).length).toBe(6);
    expect(new Set(all.items.map((i) => i.slug)).size).toBe(30);

    const products = await app.catalog.listProducts();
    for (const p of products) {
      expect(p.variants.length, p.slug).toBeGreaterThan(0);
      expect(p.images.length, p.slug).toBeGreaterThanOrEqual(1);
      for (const v of p.variants) expect(Number.isInteger(v.priceCents) && v.priceCents > 0, v.id).toBe(true);
      // Products with several variants must name the option they differ by.
      if (p.variants.length > 1) expect(p.optionName, p.slug).not.toBeNull();
    }
    await client.close();
  });
});
