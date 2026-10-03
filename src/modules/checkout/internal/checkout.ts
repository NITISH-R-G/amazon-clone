import { eq, sql } from "drizzle-orm";
import { actorFromKey, actorKey, err, ok, type Actor, type Result } from "@/lib/result";
import type { DbOrTx } from "@/lib/db";
import type { Clock, IdGenerator } from "@/lib/ports";
import type { CartModule } from "@/modules/cart";
import type { Catalog } from "@/modules/catalog";
import type { CancelError, OrdersModule, Order, RefundStatus, ShippingAddress } from "@/modules/orders";
import type { CardInput, PaymentEvent, PaymentRecord, PaymentsService } from "@/modules/payments";
import type { CheckoutError, Quote } from "../types";
import { shippingAddressSchema } from "./address";
import { applyCoupon, normaliseCode, type AppliedCoupon, type CouponError, type Promotion } from "./coupons";
import { promotions } from "../schema";
import { quoteCart } from "./quote";

/** How long the stock is held for an unpaid order. */
export const HOLD_MINUTES = 15;

export type StartCheckoutInput = {
  /** A coupon code the customer typed; the amount is always computed here. */
  couponCode?: string | null;
  address: ShippingAddress;
  contactEmail: string;
  idempotencyKey: string;
};

export type StartCheckoutError = "EMPTY_CART" | "OUT_OF_STOCK" | "INVALID_ADDRESS" | "CART_CHANGED" | "ORDER_CLOSED" | CouponError;

export type StartedCheckout = {
  order: Order;
  payment: PaymentRecord & { clientSecret: string | null };
};

export type OrderView = { order: Order; payment: PaymentRecord | null };

export type PaymentHandled = {
  orderId: string;
  paymentStatus: PaymentRecord["status"];
  orderPaid: boolean;
  duplicate: boolean;
};

export type PlaceOrderInput = {
  couponCode?: string | null;
  address: ShippingAddress;
  contactEmail: string;
  payment: CardInput;
  idempotencyKey: string;
};

export type CheckoutDeps = {
  db: DbOrTx;
  cart: Pick<CartModule, "getCart" | "clearCart">;
  catalog: Pick<Catalog, "reserveStock" | "commitReservations" | "releaseReservations" | "restoreStock">;
  orders: Pick<
    OrdersModule,
    | "createOrder"
    | "findByIdempotencyKey"
    | "cancelOrder"
    | "getOrder"
    | "getOrderById"
    | "listAwaiting"
    | "markPaid"
    | "renewCheckout"
    | "cancelById"
    | "setRefundStatus"
  >;
  payments: PaymentsService;
  clock: Clock;
  ids: IdGenerator;
};

/** Thrown inside a transaction to roll everything back with a known reason. */
class Abort<E> extends Error {
  constructor(readonly reason: E) {
    super(String(reason));
  }
}

const lineKey = (l: { variantId: string; offerId?: string | null }) => `${l.variantId}|${l.offerId ?? ""}`;

function sameLines(a: { variantId: string; offerId?: string | null; quantity: number }[], b: typeof a): boolean {
  if (a.length !== b.length) return false;
  const left = new Map(a.map((l) => [lineKey(l), l.quantity]));
  return b.every((l) => left.get(lineKey(l)) === l.quantity);
}

const refundStatusOf = (status: "pending" | "succeeded" | "failed"): RefundStatus =>
  status === "succeeded" ? "refunded" : status === "failed" ? "failed" : "pending";

export function createCheckout({ db, cart, catalog, orders, payments, clock, ids }: CheckoutDeps) {
  const holdUntil = () => new Date(clock.now().getTime() + HOLD_MINUTES * 60_000);
  const reserveLines = (o: Order) => o.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, offerId: i.offerId }));

  type Priced = { quote: Quote; coupon: AppliedCoupon | null; couponError: CouponError | null };

  /** Prices a cart, applying the coupon if there is one and it is valid. Always server side. */
  async function price(current: Parameters<typeof quoteCart>[0], code: string | null | undefined, d: DbOrTx = db): Promise<Priced> {
    if (!code || !normaliseCode(code)) return { quote: quoteCart(current), coupon: null, couponError: null };
    const [row] = await d.select().from(promotions).where(eq(promotions.code, normaliseCode(code))).limit(1);
    const applied = applyCoupon((row as Promotion | undefined) ?? null, current.subtotalCents, clock.now());
    if (!applied.ok) return { quote: quoteCart(current), coupon: null, couponError: applied.error };
    return { quote: quoteCart(current, applied.coupon.discountCents), coupon: applied.coupon, couponError: null };
  }

  async function getQuote(actor: Actor, couponCode?: string | null): Promise<Result<Priced, CheckoutError>> {
    const current = await cart.getCart(actor);
    if (current.lines.length === 0) return err("EMPTY_CART");
    return ok(await price(current, couponCode));
  }

  /**
   * Phase 1: one transaction that re-prices from the server-side cart, creates the order awaiting payment and holds
   * its stock; then (outside it) a payment at the provider. The cart stays until payment is confirmed. Starting again
   * with the same key returns the same order; starting with a new key abandons the actor's other unpaid orders.
   */
  async function startCheckout(actor: Actor, input: StartCheckoutInput): Promise<Result<StartedCheckout, StartCheckoutError>> {
    if (!shippingAddressSchema.safeParse(input.address).success) return err("INVALID_ADDRESS");
    const abandoned: string[] = [];
    try {
      const order = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${actorKey(actor)}:${input.idempotencyKey}`}))`);
        const current = await cart.getCart(actor, tx);
        const existing = await orders.findByIdempotencyKey(actor, input.idempotencyKey, tx);

        if (existing) {
          if (existing.paidAt) return existing; // already placed: replay
          if (existing.cancelledAt) throw new Abort<StartCheckoutError>("ORDER_CLOSED");
          const cartLines = current.lines.map((l) => ({ variantId: l.variantId, offerId: l.offerId, quantity: l.quantity }));
          if (cartLines.length === 0) throw new Abort<StartCheckoutError>("EMPTY_CART");
          if (!sameLines(cartLines, existing.items)) throw new Abort<StartCheckoutError>("CART_CHANGED");
          // Still the same checkout: keep (or take back) the hold and refresh the details.
          const expiresAt = holdUntil();
          const held = await catalog.reserveStock(existing.id, reserveLines(existing), expiresAt, tx);
          if (!held.ok) throw new Abort<StartCheckoutError>("OUT_OF_STOCK");
          await orders.renewCheckout(existing.id, { holdExpiresAt: expiresAt, address: input.address, contactEmail: input.contactEmail }, tx);
          return (await orders.getOrderById(existing.id, tx))!.order;
        }

        if (current.lines.length === 0) throw new Abort<StartCheckoutError>("EMPTY_CART");
        const priced = await price(current, input.couponCode, tx);
        if (priced.couponError) throw new Abort<StartCheckoutError>(priced.couponError);
        const quote = priced.quote;

        for (const other of await orders.listAwaiting(actor, tx)) {
          await catalog.releaseReservations(other.id, tx);
          await orders.cancelById(other.id, tx);
          abandoned.push(other.id);
        }

        const expiresAt = holdUntil();
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
              sku: l.sku,
              variantLabel: l.variantLabel,
              sellerName: l.sellerName,
              fulfilment: l.fulfilment,
              offerId: l.offerId,
            })),
            ...quote,
            couponCode: priced.coupon?.code ?? null,
            address: input.address,
            contactEmail: input.contactEmail,
            placedAt: clock.now(),
            holdExpiresAt: expiresAt,
            deliveryExtraMinutes: Math.max(0, ...current.lines.map((l) => l.handlingMinutes)),
          },
          tx,
        );
        const held = await catalog.reserveStock(created.id, reserveLines(created), expiresAt, tx);
        if (!held.ok) throw new Abort<StartCheckoutError>("OUT_OF_STOCK");
        return created;
      });

      for (const id of abandoned) await payments.cancelForOrder(id);
      if (order.paidAt) {
        const payment = await payments.getByOrder(order.id);
        if (payment) return ok({ order, payment: { ...payment, clientSecret: null } });
      }
      const payment = await payments.ensureForOrder({ orderId: order.id, amountCents: order.totalCents });
      return ok({ order, payment });
    } catch (e) {
      if (e instanceof Abort) return err(e.reason as StartCheckoutError);
      throw e;
    }
  }

  /**
   * The payment succeeded (a verified event, or the provider's own answer): commit the stock, place the order, clear
   * the cart. If the order was cancelled meanwhile, or its stock went to someone else while the hold had expired,
   * the order is (or stays) cancelled and the money must go back: returns true then.
   */
  async function confirmPayment(orderId: string, payment: PaymentRecord, tx: DbOrTx): Promise<{ refund: boolean }> {
    const got = await orders.getOrderById(orderId, tx, { lock: true });
    if (!got || got.order.paidAt) return { refund: false };
    if (got.order.cancelledAt) {
      await orders.setRefundStatus(orderId, "pending", tx);
      return { refund: true };
    }
    const committed = await catalog.commitReservations(orderId, tx);
    if (!committed.ok) {
      await catalog.releaseReservations(orderId, tx);
      await orders.cancelById(orderId, tx);
      await orders.setRefundStatus(orderId, "pending", tx);
      return { refund: true };
    }
    await orders.markPaid(
      orderId,
      { paidAt: clock.now(), reference: payment.providerRef, brand: payment.brand ?? "card", last4: payment.last4 ?? "0000" },
      tx,
    );
    await cart.clearCart(actorFromKey(got.ownerKey), tx);
    return { refund: false };
  }

  async function refundAndRecord(orderId: string, reason: string): Promise<void> {
    const refund = await payments.refundRest(orderId, reason);
    if (refund) await orders.setRefundStatus(orderId, refundStatusOf(refund.status));
    else if ((await payments.getByOrder(orderId))?.status === "refunded") await orders.setRefundStatus(orderId, "refunded");
  }

  /**
   * Phase 2: a payment event from the provider (webhook, fallback retrieval or the demo bank). Duplicates change
   * nothing. The order is only ever placed from here, never from a client callback.
   */
  async function handlePaymentEvent(event: PaymentEvent): Promise<Result<PaymentHandled, "UNKNOWN_PAYMENT">> {
    const result = await db.transaction(async (tx) => {
      const recorded = await payments.recordEvent(event, tx);
      if (!recorded.ok) return recorded;
      const { payment, duplicate } = recorded.value;
      const refund = payment.status === "succeeded" ? (await confirmPayment(payment.orderId, payment, tx)).refund : false;
      const order = (await orders.getOrderById(payment.orderId, tx))?.order;
      return ok({ payment, duplicate, refund, orderPaid: Boolean(order?.paidAt) });
    });
    if (!result.ok) return result;
    const { payment, duplicate, refund, orderPaid } = result.value;
    let paymentStatus = payment.status;
    if (refund) {
      await refundAndRecord(payment.orderId, "order_unavailable");
      paymentStatus = (await payments.getByOrder(payment.orderId))?.status ?? paymentStatus;
    }
    return ok({ orderId: payment.orderId, paymentStatus, orderPaid, duplicate });
  }

  async function getOrderView(actor: Actor, orderId: string): Promise<OrderView | null> {
    const order = await orders.getOrder(actor, orderId);
    if (!order) return null;
    return { order, payment: await payments.getByOrder(orderId) };
  }

  /** What the payment page needs: the order, its payment and (Stripe) the client secret for the Payment Element. */
  async function getPaymentSession(actor: Actor, orderId: string): Promise<(OrderView & { clientSecret: string | null }) | null> {
    const view = await getOrderView(actor, orderId);
    if (!view) return null;
    if (view.order.paidAt || view.order.cancelledAt || view.order.status === "expired") return { ...view, clientSecret: null };
    const payment = await payments.ensureForOrder({ orderId, amountCents: view.order.totalCents });
    return { order: view.order, payment, clientSecret: payment.clientSecret };
  }

  /** Demo bank only: the customer's card goes to the demo provider, which answers with events we then handle. */
  async function attemptDemoPayment(
    actor: Actor,
    orderId: string,
    card: CardInput,
  ): Promise<Result<PaymentHandled, "NOT_FOUND" | "NOT_PAYABLE" | "OUT_OF_STOCK" | "PAYMENT_DECLINED">> {
    const order = await orders.getOrder(actor, orderId);
    if (!order) return err("NOT_FOUND");
    if (order.cancelledAt) return err("NOT_PAYABLE");
    const existing = await payments.getByOrder(orderId);
    if (order.paidAt) {
      return ok({ orderId, paymentStatus: existing?.status ?? "succeeded", orderPaid: true, duplicate: true });
    }
    if (order.status === "expired") {
      // The hold ran out: take it back if the stock is still free.
      const expiresAt = holdUntil();
      const held = await catalog.reserveStock(orderId, reserveLines(order), expiresAt);
      if (!held.ok) return err("OUT_OF_STOCK");
      await orders.renewCheckout(orderId, { holdExpiresAt: expiresAt, address: order.address, contactEmail: order.contactEmail });
    }
    const payment = existing ?? (await payments.ensureForOrder({ orderId, amountCents: order.totalCents }));
    const submit = payments.provider.submitCard;
    if (!submit) throw new Error("This payment provider collects card details in the browser, not on the server.");
    const events = await submit.call(payments.provider, { providerRef: payment.providerRef, amountCents: order.totalCents, card });
    let last: PaymentHandled | null = null;
    for (const event of events) {
      const handled = await handlePaymentEvent(event);
      if (handled.ok) last = handled.value;
    }
    if (!last || last.paymentStatus === "failed") return err("PAYMENT_DECLINED");
    return ok(last);
  }

  /** No webhook arrived (or it is late): ask the provider directly and handle its answer like an event. */
  async function syncPayment(actor: Actor, orderId: string): Promise<OrderView | null> {
    const view = await getOrderView(actor, orderId);
    if (!view || !view.payment || view.order.paidAt) return view;
    const remote = await payments.provider.getPayment(view.payment.providerRef);
    const type = remote
      ? ({
          succeeded: "payment.succeeded",
          failed: "payment.failed",
          requires_action: "payment.requires_action",
          processing: "payment.processing",
          canceled: "payment.canceled",
        } as const)[remote.status as "succeeded" | "failed" | "requires_action" | "processing" | "canceled"]
      : undefined;
    if (remote && type) {
      await handlePaymentEvent({
        id: `sync_${view.payment.providerRef}_${remote.status}`,
        type,
        providerRef: view.payment.providerRef,
        occurredAt: clock.now(),
        brand: remote.brand,
        last4: remote.last4,
        error: remote.lastError ?? undefined,
      });
    }
    return getOrderView(actor, orderId);
  }

  /**
   * Cancels a still-cancellable order. Unpaid: release the hold and cancel the payment. Paid: put the stock back and
   * refund through the provider; the order only counts as refunded when the provider says so.
   */
  async function cancelOrder(actor: Actor, orderId: string): Promise<Result<Order, CancelError>> {
    const result = await db.transaction(async (tx) => {
      const cancelled = await orders.cancelOrder(actor, orderId, tx);
      if (!cancelled.ok) return cancelled;
      if (cancelled.value.paidAt) {
        await catalog.restoreStock(
          cancelled.value.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, offerId: i.offerId })),
          tx,
        );
        if (await payments.getByOrder(orderId, tx)) await orders.setRefundStatus(orderId, "pending", tx);
      } else {
        await catalog.releaseReservations(orderId, tx);
      }
      return cancelled;
    });
    if (!result.ok) return result;
    if (result.value.paidAt) await refundAndRecord(orderId, "order_cancelled");
    else await payments.cancelForOrder(orderId);
    return ok((await orders.getOrder(actor, orderId)) ?? result.value);
  }

  /** A cancelled order whose refund failed or is still pending: ask the provider again. */
  async function retryRefund(actor: Actor, orderId: string): Promise<Result<Order, "NOT_FOUND" | "NOT_REFUNDABLE">> {
    const order = await orders.getOrder(actor, orderId);
    if (!order) return err("NOT_FOUND");
    if (!order.cancelledAt || !order.paidAt || (order.refundStatus !== "failed" && order.refundStatus !== "pending")) return err("NOT_REFUNDABLE");
    await refundAndRecord(orderId, "order_cancelled");
    return ok((await orders.getOrder(actor, orderId)) ?? order);
  }

  /**
   * Compatibility for the one-step demo flow: start checkout, then submit the card to the demo bank. A declined
   * card leaves the order awaiting payment (the cart and the hold are kept), so nothing is lost.
   */
  async function placeOrder(actor: Actor, input: PlaceOrderInput): Promise<Result<Order, CheckoutError>> {
    const started = await startCheckout(actor, input);
    if (!started.ok) {
      return err(started.error === "CART_CHANGED" || started.error === "ORDER_CLOSED" ? "EMPTY_CART" : started.error);
    }
    if (started.value.order.paidAt) return ok(started.value.order);
    const paid = await attemptDemoPayment(actor, started.value.order.id, input.payment);
    if (!paid.ok) return err(paid.error === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "PAYMENT_DECLINED");
    const view = await getOrderView(actor, started.value.order.id);
    return view ? ok(view.order) : err("PAYMENT_DECLINED");
  }

  return { getQuote, startCheckout, getPaymentSession, handlePaymentEvent, getOrderView, attemptDemoPayment, syncPayment, cancelOrder, retryRefund, placeOrder };
}

export type Checkout = ReturnType<typeof createCheckout>;
