import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { actorKey, err, ok, type Actor, type Result } from "@/lib/result";
import type { Catalog } from "@/modules/catalog";
import { cartItems, carts } from "../schema";
import type { Cart, CartError, CartLine } from "../types";

export type CartDeps = { db: DbOrTx; catalog: Pick<Catalog, "getVariant"> };

const isPositiveInt = (n: number) => Number.isInteger(n) && n >= 1;

export function createCart({ db, catalog }: CartDeps) {
  async function findCartId(d: DbOrTx, actor: Actor): Promise<string | null> {
    const [row] = await d.select({ id: carts.id }).from(carts).where(eq(carts.actorKey, actorKey(actor))).limit(1);
    return row?.id ?? null;
  }

  async function getOrCreateCartId(d: DbOrTx, actor: Actor): Promise<string> {
    const existing = await findCartId(d, actor);
    if (existing) return existing;
    const [created] = await d.insert(carts).values({ actorKey: actorKey(actor) }).returning({ id: carts.id });
    return created.id;
  }

  /** A line (active or removed) belonging to this actor's cart, or null. */
  async function findLine(actor: Actor, lineId: string) {
    const [row] = await db
      .select({ item: cartItems })
      .from(cartItems)
      .innerJoin(carts, eq(cartItems.cartId, carts.id))
      .where(and(eq(cartItems.id, lineId), eq(carts.actorKey, actorKey(actor))))
      .limit(1);
    return row?.item ?? null;
  }

  async function getCart(actor: Actor, tx?: DbOrTx): Promise<Cart> {
    const d = tx ?? db;
    const cartId = await findCartId(d, actor);
    if (!cartId) return { lines: [], itemCount: 0, subtotalCents: 0 };
    const items = await d
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), isNull(cartItems.removedAt)));
    const lines: CartLine[] = [];
    for (const item of items) {
      const variant = await catalog.getVariant(item.variantId, d);
      if (!variant) continue;
      lines.push({
        id: item.id,
        variantId: item.variantId,
        productSlug: variant.productSlug,
        title: variant.title,
        imageUrl: variant.imageUrl,
        unitPriceCents: variant.priceCents,
        listPriceCents:
          variant.listPriceCents !== null && variant.listPriceCents > variant.priceCents ? variant.listPriceCents : null,
        quantity: item.quantity,
        lineTotalCents: variant.priceCents * item.quantity,
        available: variant.stock >= item.quantity,
      });
    }
    return {
      lines,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    };
  }

  /** The cart after an add/update, with `clamped` set on the affected line when stock reduced it. */
  async function withClamp(actor: Actor, lineId: string | null, variantId: string, clamped: boolean): Promise<Cart> {
    const cart = await getCart(actor);
    if (!clamped) return cart;
    return {
      ...cart,
      lines: cart.lines.map((l) => (l.variantId === variantId || l.id === lineId ? { ...l, clamped: true } : l)),
    };
  }

  async function addItem(actor: Actor, variantId: string, quantity: number): Promise<Result<Cart, CartError>> {
    if (!isPositiveInt(quantity)) return err("INVALID_QUANTITY");
    const variant = await catalog.getVariant(variantId);
    if (!variant) return err("VARIANT_NOT_FOUND");
    if (variant.stock < 1) return err("OUT_OF_STOCK");

    const cartId = await getOrCreateCartId(db, actor);
    const [existing] = await db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId), isNull(cartItems.removedAt)))
      .limit(1);
    const wanted = (existing?.quantity ?? 0) + quantity;
    const [row] = await db
      .insert(cartItems)
      .values({ cartId, variantId, quantity: Math.min(quantity, variant.stock) })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId],
        set: {
          // A removed line restarts from the new quantity; an active line accumulates.
          quantity: sql`LEAST(CASE WHEN ${cartItems.removedAt} IS NULL THEN ${cartItems.quantity} + ${quantity} ELSE ${quantity} END, ${variant.stock})`,
          removedAt: null,
        },
      })
      .returning({ quantity: cartItems.quantity });
    return ok(await withClamp(actor, null, variantId, row.quantity < wanted));
  }

  async function setQuantity(actor: Actor, lineId: string, quantity: number): Promise<Result<Cart, CartError>> {
    if (!isPositiveInt(quantity)) return err("INVALID_QUANTITY");
    const line = await findLine(actor, lineId);
    if (!line || line.removedAt) return err("LINE_NOT_FOUND");
    const variant = await catalog.getVariant(line.variantId);
    if (!variant) return err("VARIANT_NOT_FOUND");
    const next = Math.min(quantity, Math.max(variant.stock, 1));
    await db.update(cartItems).set({ quantity: next }).where(eq(cartItems.id, lineId));
    return ok(await withClamp(actor, lineId, line.variantId, next < quantity));
  }

  async function removeItem(actor: Actor, lineId: string): Promise<Result<Cart, CartError>> {
    const line = await findLine(actor, lineId);
    if (!line) return err("LINE_NOT_FOUND");
    await db.update(cartItems).set({ removedAt: sql`now()` }).where(eq(cartItems.id, lineId));
    return ok(await getCart(actor));
  }

  /** Undo of `removeItem`. */
  async function restoreItem(actor: Actor, lineId: string): Promise<Result<Cart, CartError>> {
    const line = await findLine(actor, lineId);
    if (!line) return err("LINE_NOT_FOUND");
    await db.update(cartItems).set({ removedAt: null }).where(eq(cartItems.id, lineId));
    return ok(await getCart(actor));
  }

  async function clearCart(actor: Actor, tx?: DbOrTx): Promise<void> {
    const d = tx ?? db;
    const cartId = await findCartId(d, actor);
    if (cartId) await d.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  return { getCart, addItem, setQuantity, removeItem, restoreItem, clearCart };
}

export type CartModule = ReturnType<typeof createCart>;
