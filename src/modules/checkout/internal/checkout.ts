import { sql } from "drizzle-orm";
import { actorKey, err, ok, type Actor, type Result } from "@/lib/result";
import type { DbOrTx } from "@/lib/db";
import type { Clock, IdGenerator } from "@/lib/ports";
import type { CartModule } from "@/modules/cart";
import type { Catalog } from "@/modules/catalog";
import type { OrdersModule, Order, ShippingAddress } from "@/modules/orders";
import type { CardInput, PaymentProvider } from "@/modules/payments";
import type { CheckoutError, Quote } from "../types";
import { shippingAddressSchema } from "./address";
import { quoteCart } from "./quote";

export type PlaceOrderInput = {
  address: ShippingAddress;
  contactEmail: string;
  payment: CardInput;
  idempotencyKey: string;
};

export type CheckoutDeps = {
  db: DbOrTx;
  cart: Pick<CartModule, "getCart" | "clearCart">;
  catalog: Pick<Catalog, "decrementStock">;
  orders: Pick<OrdersModule, "createOrder" | "findByIdempotencyKey">;
  payments: PaymentProvider;
  clock: Clock;
  ids: IdGenerator;
};

/** Thrown inside the transaction to roll everything back with a known reason. */
class Abort extends Error {
  constructor(readonly reason: CheckoutError) {
    super(reason);
  }
}

export function createCheckout({ db, cart, catalog, orders, payments, clock, ids }: CheckoutDeps) {
  async function getQuote(actor: Actor): Promise<Result<Quote, CheckoutError>> {
    const current = await cart.getCart(actor);
    if (current.lines.length === 0) return err("EMPTY_CART");
    return ok(quoteCart(current));
  }

  /**
   * One transaction: re-price from the server-side cart, take stock, authorise
   * payment, create the order, clear the cart. The client never supplies prices.
   * Any failure rolls back everything.
   */
  async function placeOrder(actor: Actor, input: PlaceOrderInput): Promise<Result<Order, CheckoutError>> {
    if (!shippingAddressSchema.safeParse(input.address).success) return err("INVALID_ADDRESS");
    try {
      const order = await db.transaction(async (tx) => {
        // Serialise concurrent submissions of the same key, then replay if already placed.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${actorKey(actor)}:${input.idempotencyKey}`}))`);
        const existing = await orders.findByIdempotencyKey(actor, input.idempotencyKey, tx);
        if (existing) return existing;

        const current = await cart.getCart(actor, tx);
        if (current.lines.length === 0) throw new Abort("EMPTY_CART");
        const quote = quoteCart(current);

        const stock = await catalog.decrementStock(
          current.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          tx,
        );
        if (!stock.ok) throw new Abort("OUT_OF_STOCK");

        const payment = await payments.authorize({
          amountCents: quote.totalCents,
          card: input.payment,
          idempotencyKey: input.idempotencyKey,
        });
        if (payment.status !== "approved") throw new Abort("PAYMENT_DECLINED");

        const created = await orders.createOrder(
          {
            owner: actor,
            number: ids.orderNumber(),
            idempotencyKey: input.idempotencyKey,
            items: current.lines.map((l) => ({
              variantId: l.variantId,
              title: l.title,
              unitPriceCents: l.unitPriceCents,
              quantity: l.quantity,
              imageUrl: l.imageUrl,
            })),
            ...quote,
            address: input.address,
            contactEmail: input.contactEmail,
            payment: { reference: payment.reference, brand: payment.brand, last4: payment.last4 },
            placedAt: clock.now(),
          },
          tx,
        );
        await cart.clearCart(actor, tx);
        return created;
      });
      return ok(order);
    } catch (e) {
      if (e instanceof Abort) return err(e.reason);
      throw e;
    }
  }

  return { getQuote, placeOrder };
}

export type Checkout = ReturnType<typeof createCheckout>;
