import { describe, expect, it } from "vitest";
import type { Clock } from "@/lib/ports";
import { createTestApp } from "@/test-support/app";

const g1 = { guestToken: "g1" };
const g2 = { guestToken: "g2" };
const T0 = new Date("2026-10-03T12:00:00Z").getTime();
const MIN = 60_000;

async function setup() {
  let now = T0;
  const clock: Clock = { now: () => new Date(now) };
  const app = await createTestApp({ clock });
  await app.cart.addItem(g1, "var-kettle", 2); // stock 5
  const placed = await app.checkout.placeOrder(g1, {
    address: { name: "A B", line1: "1 Test St", city: "Testville", region: "TS", postalCode: "12345", country: "US" },
    contactEmail: "a@example.test",
    payment: { number: "4242424242424242", expiry: "12/30", cvc: "123" },
    idempotencyKey: "k1",
  });
  if (!placed.ok) throw new Error("setup failed: order not placed");
  const at = (minutes: number) => {
    now = T0 + minutes * MIN;
  };
  const read = async (actor = g1) => (await app.orders.getOrder(actor, placed.value.id)) as NonNullable<Awaited<ReturnType<typeof app.orders.getOrder>>>;
  return { app, id: placed.value.id, at, read };
}

describe("order lifecycle", () => {
  it("T55: status advances with time: placed, shipped, out for delivery, delivered, with a timeline and an estimate", async () => {
    const { at, read } = await setup();

    const first = await read();
    expect(first.status).toBe("placed");
    expect(first.estimatedDelivery).toEqual(new Date(T0 + 120 * MIN));
    expect(first.timeline.map((s) => [s.status, s.reached])).toEqual([
      ["placed", true],
      ["shipped", false],
      ["out_for_delivery", false],
      ["delivered", false],
    ]);

    const statusAt = async (minutes: number) => {
      at(minutes);
      return (await read()).status;
    };
    expect(await statusAt(4.99)).toBe("placed");
    expect(await statusAt(5)).toBe("shipped");
    expect(await statusAt(29.99)).toBe("shipped");
    expect(await statusAt(30)).toBe("out_for_delivery");
    expect(await statusAt(119.99)).toBe("out_for_delivery");
    expect(await statusAt(120)).toBe("delivered");

    const delivered = await read();
    expect(delivered.timeline.map((s) => [s.status, s.at.getTime(), s.reached])).toEqual([
      ["placed", T0, true],
      ["shipped", T0 + 5 * MIN, true],
      ["out_for_delivery", T0 + 30 * MIN, true],
      ["delivered", T0 + 120 * MIN, true],
    ]);
  });

  it("T56: cancelling inside the window cancels the order, puts the stock back and is final", async () => {
    const { app, id, at, read } = await setup();
    expect((await app.catalog.getAvailability("var-kettle")).quantity).toBe(3);

    at(4);
    expect((await read()).cancellable).toBe(true);
    const cancelled = await app.checkout.cancelOrder(g1, id);
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) {
      expect(cancelled.value.status).toBe("cancelled");
      expect(cancelled.value.cancelledAt).toEqual(new Date(T0 + 4 * MIN));
      expect(cancelled.value.cancellable).toBe(false);
      expect(cancelled.value.timeline.map((s) => [s.status, s.reached])).toEqual([
        ["placed", true],
        ["cancelled", true],
      ]);
    }
    expect((await app.catalog.getAvailability("var-kettle")).quantity).toBe(5);

    expect(await app.checkout.cancelOrder(g1, id)).toEqual({ ok: false, error: "NOT_CANCELLABLE" }); // twice
    at(600); // a cancelled order never moves on
    expect((await read()).status).toBe("cancelled");
    expect((await app.catalog.getAvailability("var-kettle")).quantity).toBe(5);
  });

  it("T57: after shipping an order cannot be cancelled; other people's and unknown orders are not found", async () => {
    const { app, id, at, read } = await setup();

    expect(await app.checkout.cancelOrder(g2, id)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await app.checkout.cancelOrder(g1, "00000000-0000-4000-8000-000000000000")).toEqual({ ok: false, error: "NOT_FOUND" });

    at(5);
    expect((await read()).cancellable).toBe(false);
    expect(await app.checkout.cancelOrder(g1, id)).toEqual({ ok: false, error: "NOT_CANCELLABLE" });
    expect((await read()).status).toBe("shipped");
    expect((await app.catalog.getAvailability("var-kettle")).quantity).toBe(3); // stock untouched
  });
});
