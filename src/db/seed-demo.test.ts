import { existsSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { pgliteExtensions } from "@/lib/pglite";
import { createSystemIds, systemClock } from "@/lib/ports";
import { createDemoProvider } from "@/modules/payments";
import { createApp } from "@/server/app";
import { CATALOG_SIZE, generateCatalog } from "./catalog/generate";
import { seedDemoCatalog } from "./seed-demo";

describe("demo catalogue", () => {
  it("T34: seeds once, is searchable, and every product is purchasable data", async () => {
    const client = new PGlite({ extensions: pgliteExtensions });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    await seedDemoCatalog(db);
    await seedDemoCatalog(db); // idempotent

    const ids = createSystemIds();
    const app = createApp({ db, clock: systemClock, ids, payments: createDemoProvider({ clock: systemClock, ids }) });

    const all = await app.search.searchProducts({ pageSize: 100 });
    expect(all.total).toBe(CATALOG_SIZE);
    expect((await app.catalog.listCategories()).length).toBe(9);

    const products = await app.catalog.listProducts();
    expect(new Set(products.map((p) => p.slug)).size).toBe(CATALOG_SIZE);
    for (const p of products) {
      // Every product page has technical details, and every image is a file we ship.
      expect(p.specs.length, p.slug).toBeGreaterThanOrEqual(4);
      for (const image of p.images) expect(existsSync(`public${image.url}`), `${p.slug}: ${image.url}`).toBe(true);
      for (const v of p.variants) for (const image of v.images) expect(existsSync(`public${image.url}`), `${v.id}: ${image.url}`).toBe(true);
      expect(p.variants.length, p.slug).toBeGreaterThan(0);
      expect(p.images.length, p.slug).toBeGreaterThanOrEqual(1);
      for (const v of p.variants) expect(Number.isInteger(v.priceCents) && v.priceCents > 0, v.id).toBe(true);
      // Products with several variants must name the option they differ by.
      if (p.variants.length > 1) expect(p.optionName, p.slug).not.toBeNull();
    }

    // The attribute system: types, definitions per type, and real multi-dimension variants.
    const types = await app.catalog.listTypes();
    expect(types.length).toBeGreaterThanOrEqual(43);
    const phoneSeed = generateCatalog().find((p) => p.typeSlug === "smartphones" && p.variants.length >= 8);
    if (!phoneSeed) throw new Error("no rich phone generated");
    const phone = await app.catalog.getProduct(phoneSeed.slug);
    expect(phone?.attributes.processor).toBeTruthy();
    expect(phone?.variants.length).toBe(phoneSeed.variants.length);
    const type = await app.catalog.getType(phone?.typeId as string);
    expect(type?.slug).toBe("smartphones");
    expect(type?.attributes.filter((a) => a.role === "variation").map((a) => a.key)).toEqual(["color", "storage", "ram"]);
    expect(type?.attributes.find((a) => a.key === "storage")?.values).toEqual(["128 GB", "256 GB", "512 GB", "1 TB"]);
    for (const v of phone?.variants ?? []) {
      expect(v.sku, v.id).toMatch(/^CT-SMA-/);
      expect(Object.keys(v.selections).sort()).toEqual(["color", "ram", "storage"]);
      expect(v.images.length).toBe(2);
    }
    const pictures = new Map((phone?.variants ?? []).map((v) => [v.selections.color, v.images[0].url]));
    expect(new Set(pictures.values()).size).toBe(pictures.size); // each colour has its own picture

    // Marketplace offers: hundreds in total, and the curated headphones have competing sellers.
    const headphones = await app.catalog.getProduct("studio-headphones");
    const offerMap = await app.catalog.listOffers((headphones?.variants ?? []).map((v) => v.id));
    expect(Object.values(offerMap).flat().length).toBeGreaterThan(0);

    // Search over the real catalogue: nonsense and very common words must not turn into matches.
    for (const text of ["something-that-does-not-exist", "this is not a product", "qwertyuiop asdfghjkl"]) {
      expect((await app.search.searchProducts({ text })).total, text).toBe(0);
    }
    expect((await app.search.searchProducts({ text: "wireless headphones" })).total).toBeGreaterThan(10);
    expect((await app.search.searchProducts({ text: "wireles headphnes" })).total).toBeGreaterThan(10); // typos
    expect((await app.search.suggest("wirel")).length).toBeGreaterThan(0);
    await client.close();
  });
});
