import { and, asc, eq, gt, gte, inArray, ne, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { err, ok, type Result } from "@/lib/result";
import type { Clock } from "@/lib/ports";
import { attributeDefs, categories, offers, productTypes, products, sellers, stockReservations, variants } from "../schema";
import type { OfferView } from "../offers";
import type { AttributeDef, Category, Product, ProductType, VariantDetail } from "../types";
import { createFind } from "./find";

type ProductRow = typeof products.$inferSelect;

function toProduct(row: ProductRow, rows: Product["variants"]): Product {
  const { ratingTenths, ...rest } = row;
  return { ...rest, rating: ratingTenths / 10, variants: rows };
}

export type CatalogDeps = { db: DbOrTx; clock: Clock };

class OutOfStockSignal extends Error {
  constructor(readonly variantId: string) {
    super(`out of stock: ${variantId}`);
  }
}

async function loadType(d: DbOrTx, where: ReturnType<typeof eq>): Promise<ProductType | null> {
  const [type] = await d.select().from(productTypes).where(where).limit(1);
  if (!type) return null;
  const defs = await d.select().from(attributeDefs).where(eq(attributeDefs.typeId, type.id)).orderBy(asc(attributeDefs.position));
  const attributes: AttributeDef[] = defs.map(({ key, label, role, facet, values }) => ({ key, label, role, facet, values }));
  return { id: type.id, slug: type.slug, name: type.name, categoryId: type.categoryId, attributes };
}

export type ReserveLine = { variantId: string; quantity: number; offerId?: string | null };

/** The stock row of a unit (first-party variant or seller offer), locked until the transaction ends. */
async function lockStock(t: DbOrTx, variantId: string, offerId: string): Promise<number | undefined> {
  if (offerId) {
    const [row] = await t
      .select({ stock: offers.stock })
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.variantId, variantId)))
      .for("update");
    return row?.stock;
  }
  const [row] = await t.select({ stock: variants.stock }).from(variants).where(eq(variants.id, variantId)).for("update");
  return row?.stock;
}

/** Units of this stock held by other orders right now (unexpired holds only). */
async function heldByOthers(t: DbOrTx, orderId: string, variantId: string, offerId: string, now: Date): Promise<number> {
  const [row] = await t
    .select({ held: sql<number>`coalesce(sum(${stockReservations.quantity}), 0)` })
    .from(stockReservations)
    .where(
      and(
        eq(stockReservations.variantId, variantId),
        eq(stockReservations.offerId, offerId),
        eq(stockReservations.status, "held"),
        gt(stockReservations.expiresAt, now),
        ne(stockReservations.orderId, orderId),
      ),
    );
  return Number(row?.held ?? 0);
}

export function createCatalog({ db, clock }: CatalogDeps) {
  return {
    /** Filtered, searched, sorted and paginated products with facet counts (see ./find.ts). */
    findProducts: createFind({ db }),

    async getProduct(slug: string, tx?: DbOrTx): Promise<Product | null> {
      const d = tx ?? db;
      const [product] = await d.select().from(products).where(eq(products.slug, slug)).limit(1);
      if (!product) return null;
      const rows = await d
        .select()
        .from(variants)
        .where(eq(variants.productId, product.id))
        .orderBy(asc(variants.id));
      return toProduct(product, rows);
    },

    async listProducts(tx?: DbOrTx): Promise<Product[]> {
      const d = tx ?? db;
      const rows = await d.select().from(products).orderBy(asc(products.title));
      if (rows.length === 0) return [];
      const all = await d.select().from(variants).orderBy(asc(variants.id));
      return rows.map((p) =>
        toProduct(
          p,
          all.filter((v) => v.productId === p.id),
        ),
      );
    },

    async listCategories(tx?: DbOrTx): Promise<Category[]> {
      return (tx ?? db).select().from(categories).orderBy(asc(categories.position), asc(categories.name));
    },

    async getVariant(id: string, tx?: DbOrTx): Promise<VariantDetail | null> {
      const d = tx ?? db;
      const [row] = await d
        .select({ variant: variants, product: products })
        .from(variants)
        .innerJoin(products, eq(variants.productId, products.id))
        .where(eq(variants.id, id))
        .limit(1);
      if (!row) return null;
      const { variant, product } = row;
      return {
        ...variant,
        productSlug: product.slug,
        title: variant.label ? `${product.title} (${variant.label})` : product.title,
        // The picture follows the variant (a Black phone shows black), else the product's.
        imageUrl: variant.images[0]?.url ?? product.images[0]?.url ?? null,
      };
    },

    /** A product type with its attribute definitions in display order, by id. */
    async getType(typeId: string, tx?: DbOrTx): Promise<ProductType | null> {
      return loadType(tx ?? db, eq(productTypes.id, typeId));
    },

    async getTypeBySlug(slug: string, tx?: DbOrTx): Promise<ProductType | null> {
      return loadType(tx ?? db, eq(productTypes.slug, slug));
    },

    /** Types in navigation order, optionally within one department (category slug). */
    async listTypes(categorySlug?: string, tx?: DbOrTx): Promise<{ id: string; slug: string; name: string; categoryId: string }[]> {
      const d = tx ?? db;
      const rows = await d
        .select({ id: productTypes.id, slug: productTypes.slug, name: productTypes.name, categoryId: productTypes.categoryId, position: productTypes.position })
        .from(productTypes)
        .leftJoin(categories, eq(productTypes.categoryId, categories.id))
        .where(categorySlug ? eq(categories.slug, categorySlug) : undefined)
        .orderBy(asc(productTypes.position));
      return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, categoryId: r.categoryId }));
    },

    async getAvailability(variantId: string, tx?: DbOrTx): Promise<{ inStock: boolean; quantity: number }> {
      const d = tx ?? db;
      const [row] = await d.select({ stock: variants.stock }).from(variants).where(eq(variants.id, variantId)).limit(1);
      const quantity = row?.stock ?? 0;
      return { inStock: quantity > 0, quantity };
    },

    /** Seller offers for these variants (the first-party offer is the variant itself), cheapest landed price first. */
    async listOffers(variantIds: string[], tx?: DbOrTx): Promise<Record<string, (OfferView & { offerId: string })[]>> {
      const d = tx ?? db;
      const out: Record<string, (OfferView & { offerId: string })[]> = {};
      if (variantIds.length === 0) return out;
      const rows = await d
        .select({ offer: offers, sellerName: sellers.name })
        .from(offers)
        .innerJoin(sellers, eq(offers.sellerId, sellers.id))
        .where(inArray(offers.variantId, variantIds));
      for (const { offer, sellerName } of rows) {
        (out[offer.variantId] ||= []).push({
          offerId: offer.id,
          sellerName,
          fulfilment: offer.fulfilment,
          priceCents: offer.priceCents,
          listPriceCents: offer.listPriceCents,
          shippingCents: offer.shippingCents,
          handlingMinutes: offer.handlingMinutes,
          stock: offer.stock,
        });
      }
      for (const list of Object.values(out)) list.sort((a, b) => a.priceCents + a.shippingCents - (b.priceCents + b.shippingCents));
      return out;
    },

    /** One seller offer with the variant it belongs to, or null. */
    async getOffer(id: string, tx?: DbOrTx): Promise<(OfferView & { offerId: string; variantId: string }) | null> {
      const d = tx ?? db;
      const [row] = await d
        .select({ offer: offers, sellerName: sellers.name })
        .from(offers)
        .innerJoin(sellers, eq(offers.sellerId, sellers.id))
        .where(eq(offers.id, id))
        .limit(1);
      if (!row) return null;
      const { offer, sellerName } = row;
      return {
        offerId: offer.id,
        variantId: offer.variantId,
        sellerName,
        fulfilment: offer.fulfilment,
        priceCents: offer.priceCents,
        listPriceCents: offer.listPriceCents,
        shippingCents: offer.shippingCents,
        handlingMinutes: offer.handlingMinutes,
        stock: offer.stock,
      };
    },

    /**
     * Holds stock for an order while its payment is pending. All lines or none. The stock row is locked first, so
     * two customers racing for the final unit are serialised: the second sees the first's hold and fails.
     */
    async reserveStock(orderId: string, lines: ReserveLine[], expiresAt: Date, tx?: DbOrTx): Promise<Result<void, { variantId: string }>> {
      const now = clock.now();
      const ordered = [...lines].sort((a, b) => `${a.variantId}|${a.offerId ?? ""}`.localeCompare(`${b.variantId}|${b.offerId ?? ""}`));
      try {
        await (tx ?? db).transaction(async (t) => {
          for (const line of ordered) {
            const offerId = line.offerId ?? "";
            const stock = await lockStock(t, line.variantId, offerId);
            if (stock === undefined) throw new OutOfStockSignal(line.variantId);
            const [existing] = await t
              .select({ status: stockReservations.status })
              .from(stockReservations)
              .where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.variantId, line.variantId), eq(stockReservations.offerId, offerId)));
            if (existing?.status === "committed") continue;
            if (stock - (await heldByOthers(t, orderId, line.variantId, offerId, now)) < line.quantity) throw new OutOfStockSignal(line.variantId);
            await t
              .insert(stockReservations)
              .values({ orderId, variantId: line.variantId, offerId, quantity: line.quantity, expiresAt, status: "held" })
              .onConflictDoUpdate({
                target: [stockReservations.orderId, stockReservations.variantId, stockReservations.offerId],
                set: { quantity: line.quantity, expiresAt, status: "held" },
              });
          }
        });
        return ok(undefined);
      } catch (e) {
        if (e instanceof OutOfStockSignal) return err({ variantId: e.variantId });
        throw e;
      }
    },

    /**
     * Turns an order's holds into sold stock (payment confirmed). Idempotent. A hold that already expired still
     * commits if the unit is free, and fails if another order has since taken it.
     */
    async commitReservations(orderId: string, tx?: DbOrTx): Promise<Result<void, { variantId: string }>> {
      const now = clock.now();
      try {
        await (tx ?? db).transaction(async (t) => {
          const held = await t
            .select()
            .from(stockReservations)
            .where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, "held")));
          for (const r of held) {
            const stock = await lockStock(t, r.variantId, r.offerId);
            if (stock === undefined || stock - (await heldByOthers(t, orderId, r.variantId, r.offerId, now)) < r.quantity) {
              throw new OutOfStockSignal(r.variantId);
            }
            if (r.offerId) await t.update(offers).set({ stock: sql`${offers.stock} - ${r.quantity}` }).where(eq(offers.id, r.offerId));
            else await t.update(variants).set({ stock: sql`${variants.stock} - ${r.quantity}` }).where(eq(variants.id, r.variantId));
            await t.update(stockReservations).set({ status: "committed" }).where(eq(stockReservations.id, r.id));
          }
        });
        return ok(undefined);
      } catch (e) {
        if (e instanceof OutOfStockSignal) return err({ variantId: e.variantId });
        throw e;
      }
    },

    /** Gives held (not yet committed) stock back: payment failed, expired or the order was cancelled. */
    async releaseReservations(orderId: string, tx?: DbOrTx): Promise<void> {
      await (tx ?? db)
        .update(stockReservations)
        .set({ status: "released" })
        .where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, "held")));
    },

    /** Puts units back (a cancelled order). Pass the caller's `tx` to join its transaction. */
    async restoreStock(lines: { variantId: string; quantity: number; offerId?: string | null }[], tx?: DbOrTx): Promise<void> {
      const d = tx ?? db;
      for (const { variantId, quantity, offerId } of lines) {
        if (offerId) await d.update(offers).set({ stock: sql`${offers.stock} + ${quantity}` }).where(eq(offers.id, offerId));
        else await d.update(variants).set({ stock: sql`${variants.stock} + ${quantity}` }).where(eq(variants.id, variantId));
      }
    },

    /** All-or-nothing across lines. Pass the caller's `tx` to join its transaction. */
    async decrementStock(
      lines: { variantId: string; quantity: number; offerId?: string | null }[],
      tx?: DbOrTx,
    ): Promise<Result<void, { variantId: string }>> {
      try {
        await (tx ?? db).transaction(async (t) => {
          for (const { variantId, quantity, offerId } of lines) {
            // A seller offer has its own stock; first-party lines take it from the variant.
            const updated = offerId
              ? await t
                  .update(offers)
                  .set({ stock: sql`${offers.stock} - ${quantity}` })
                  .where(and(eq(offers.id, offerId), gte(offers.stock, quantity)))
                  .returning({ id: offers.id })
              : await t
                  .update(variants)
                  .set({ stock: sql`${variants.stock} - ${quantity}` })
                  .where(and(eq(variants.id, variantId), gte(variants.stock, quantity)))
                  .returning({ id: variants.id });
            if (updated.length === 0) throw new OutOfStockSignal(variantId);
          }
        });
        return ok(undefined);
      } catch (e) {
        if (e instanceof OutOfStockSignal) return err({ variantId: e.variantId });
        throw e;
      }
    },
  };
}

export type Catalog = ReturnType<typeof createCatalog>;
