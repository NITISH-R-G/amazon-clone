import { and, asc, eq, gte, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { err, ok, type Result } from "@/lib/result";
import { categories, products, variants } from "../schema";
import type { AvailabilityState, Category, Product, VariantDetail } from "../types";
import { createFind } from "./find";

/** Out of stock at 0, low stock from 1 to 5, otherwise in stock. */
export function availabilityState(stock: number): AvailabilityState {
  if (stock <= 0) return "out_of_stock";
  return stock <= 5 ? "low_stock" : "in_stock";
}

type ProductRow = typeof products.$inferSelect;

function toProduct(row: ProductRow, rows: Product["variants"]): Product {
  const { ratingTenths, ...rest } = row;
  return { ...rest, rating: ratingTenths / 10, variants: rows };
}

export type CatalogDeps = { db: DbOrTx };

class OutOfStockSignal extends Error {
  constructor(readonly variantId: string) {
    super(`out of stock: ${variantId}`);
  }
}

export function createCatalog({ db }: CatalogDeps) {
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
        imageUrl: product.images[0]?.url ?? null,
      };
    },

    async getAvailability(variantId: string, tx?: DbOrTx): Promise<{ inStock: boolean; quantity: number }> {
      const d = tx ?? db;
      const [row] = await d.select({ stock: variants.stock }).from(variants).where(eq(variants.id, variantId)).limit(1);
      const quantity = row?.stock ?? 0;
      return { inStock: quantity > 0, quantity };
    },

    /** Puts units back (a cancelled order). Pass the caller's `tx` to join its transaction. */
    async restoreStock(lines: { variantId: string; quantity: number }[], tx?: DbOrTx): Promise<void> {
      const d = tx ?? db;
      for (const { variantId, quantity } of lines) {
        await d
          .update(variants)
          .set({ stock: sql`${variants.stock} + ${quantity}` })
          .where(eq(variants.id, variantId));
      }
    },

    /** All-or-nothing across lines. Pass the caller's `tx` to join its transaction. */
    async decrementStock(
      lines: { variantId: string; quantity: number }[],
      tx?: DbOrTx,
    ): Promise<Result<void, { variantId: string }>> {
      try {
        await (tx ?? db).transaction(async (t) => {
          for (const { variantId, quantity } of lines) {
            const updated = await t
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
