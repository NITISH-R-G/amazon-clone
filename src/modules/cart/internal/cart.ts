import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { actorKey, err, ok, type Actor, type Result } from "@/lib/result";
import type { Catalog } from "@/modules/catalog";
import { cartItems, carts } from "../schema";
import type { Cart, CartError, CartLine } from "../types";

export type CartDeps = { db: DbOrTx; catalog: Pick<Catalog, "getVariant" | "getOffer"> };

const isPositiveInt = (n: number) => Number.isInteger(n) && n >= 1;

/** `cart_items.offer_id` is '' for the first-party offer (the variant itself). */
const FIRST_PARTY = "";

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

  /** Price, stock and seller of a line: from its offer, or from the variant for first-party lines. */
  async function sourceOf(d: DbOrTx, variantId: string, offerId: string) {
    const variant = await catalog.getVariant(variantId, d);
    if (!variant) return null;
    if (offerId === FIRST_PARTY) {
      return {
        variant,
        offerId: null as string | null,
        sellerName: "Cartly",
        fulfilment: "cartly" as const,
        priceCents: variant.priceCents,
        listPriceCents: variant.listPriceCents,
        shippingCents: 0,
        handlingMinutes: 0,
        stock: variant.stock,
      };
    }
    const offer = await catalog.getOffer(offerId, d);
    if (!offer || offer.variantId !== variantId) return null;
    return { variant, ...offer, offerId: offer.offerId as string | null };
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
      const source = await sourceOf(d, item.variantId, item.offerId);
      if (!source) continue;
      const { variant } = source;
      lines.push({
        id: item.id,
        variantId: item.variantId,
        offerId: source.offerId,
        sellerName: source.sellerName,
        fulfilment: source.fulfilment,
        shippingCents: source.shippingCents,
        handlingMinutes: source.handlingMinutes,
        productSlug: variant.productSlug,
        title: variant.title,
        imageUrl: variant.imageUrl,
        sku: variant.sku,
        variantLabel: variant.label,
        unitPriceCents: source.priceCents,
        listPriceCents:
          source.listPriceCents !== null && source.listPriceCents > source.priceCents ? source.listPriceCents : null,
        quantity: item.quantity,
        lineTotalCents: source.priceCents * item.quantity,
        available: source.stock >= item.quantity,
      });
    }
    return {
      lines,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
    };
  }

  /** The cart after an add/update, with `clamped` set on the affected line when stock reduced it. */
  async function withClamp(actor: Actor, lineId: string | null, key: { variantId: string; offerId: string | null }, clamped: boolean): Promise<Cart> {
    const cart = await getCart(actor);
    if (!clamped) return cart;
    return {
      ...cart,
      lines: cart.lines.map((l) =>
        l.id === lineId || (l.variantId === key.variantId && l.offerId === key.offerId) ? { ...l, clamped: true } : l,
      ),
    };
  }

  /** Adds `quantity` of a variant, from the first-party offer or from the named seller offer. */
  async function addItem(
    actor: Actor,
    variantId: string,
    quantity: number,
    offerId?: string | null,
  ): Promise<Result<Cart, CartError>> {
    if (!isPositiveInt(quantity)) return err("INVALID_QUANTITY");
    const key = offerId ?? FIRST_PARTY;
    const source = await sourceOf(db, variantId, key);
    if (!source) return err(key === FIRST_PARTY ? "VARIANT_NOT_FOUND" : (await catalog.getVariant(variantId)) ? "OFFER_NOT_FOUND" : "VARIANT_NOT_FOUND");
    if (source.stock < 1) return err("OUT_OF_STOCK");

    const cartId = await getOrCreateCartId(db, actor);
    const [existing] = await db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId), eq(cartItems.offerId, key), isNull(cartItems.removedAt)),
      )
      .limit(1);
    const wanted = (existing?.quantity ?? 0) + quantity;
    const [row] = await db
      .insert(cartItems)
      .values({ cartId, variantId, offerId: key, quantity: Math.min(quantity, source.stock) })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId, cartItems.offerId],
        set: {
          // A removed line restarts from the new quantity; an active line accumulates.
          quantity: sql`LEAST(CASE WHEN ${cartItems.removedAt} IS NULL THEN ${cartItems.quantity} + ${quantity} ELSE ${quantity} END, ${source.stock})`,
          removedAt: null,
        },
      })
      .returning({ quantity: cartItems.quantity });
    return ok(await withClamp(actor, null, { variantId, offerId: source.offerId }, row.quantity < wanted));
  }

  async function setQuantity(actor: Actor, lineId: string, quantity: number): Promise<Result<Cart, CartError>> {
    if (!isPositiveInt(quantity)) return err("INVALID_QUANTITY");
    const line = await findLine(actor, lineId);
    if (!line || line.removedAt) return err("LINE_NOT_FOUND");
    const source = await sourceOf(db, line.variantId, line.offerId);
    if (!source) return err("VARIANT_NOT_FOUND");
    const next = Math.min(quantity, Math.max(source.stock, 1));
    await db.update(cartItems).set({ quantity: next }).where(eq(cartItems.id, lineId));
    return ok(await withClamp(actor, lineId, { variantId: line.variantId, offerId: source.offerId }, next < quantity));
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

  /**
   * After sign-in: the guest cart's lines join the account's cart (quantities add up,
   * clamped to stock) and the guest cart is emptied. A guest with no cart is a no-op.
   */
  async function mergeGuestCart(guestToken: string, userId: string): Promise<void> {
    const guest: Actor = { guestToken };
    const guestCartId = await findCartId(db, guest);
    if (!guestCartId) return;
    const lines = await db
      .select({ variantId: cartItems.variantId, offerId: cartItems.offerId, quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, guestCartId), isNull(cartItems.removedAt)));
    for (const line of lines) await addItem({ userId }, line.variantId, line.quantity, line.offerId || null);
    await db.delete(cartItems).where(eq(cartItems.cartId, guestCartId));
  }

  return { getCart, addItem, setQuantity, removeItem, restoreItem, clearCart, mergeGuestCart };
}

export type CartModule = ReturnType<typeof createCart>;
