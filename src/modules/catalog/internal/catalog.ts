import { and, asc, eq, gte, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { err, ok, type Result } from "@/lib/result";
import { attributeDefs, categories, productTypes, products, variants } from "../schema";
import type { AttributeDef, AvailabilityState, Category, Product, ProductType, VariantDetail } from "../types";
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

async function loadType(d: DbOrTx, where: ReturnType<typeof eq>): Promise<ProductType | null> {
  const [type] = await d.select().from(productTypes).where(where).limit(1);
  if (!type) return null;
  const defs = await d.select().from(attributeDefs).where(eq(attributeDefs.typeId, type.id)).orderBy(asc(attributeDefs.position));
  const attributes: AttributeDef[] = defs.map(({ key, label, role, facet, values }) => ({ key, label, role, facet, values }));
  return { id: type.id, slug: type.slug, name: type.name, categoryId: type.categoryId, attributes };
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
