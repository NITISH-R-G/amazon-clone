import { describe, expect, it } from "vitest";
import type { Clock } from "@/lib/ports";
import { createTestApp } from "@/test-support/app";

const T0 = new Date("2026-10-03T12:00:00Z").getTime();
const MIN = 60_000;

async function setup() {
  let now = T0;
  const clock: Clock = { now: () => new Date(now) };
  const app = await createTestApp({ clock });
  const hold = (orderId: string, lines: { variantId: string; quantity: number; offerId?: string | null }[], minutes = 15) =>
    app.catalog.reserveStock(orderId, lines, new Date(now + minutes * MIN));
  const stock = async (variantId: string) => (await app.catalog.getAvailability(variantId)).quantity;
  return { app, hold, stock, advance: (minutes: number) => (now += minutes * MIN) };
}

const mug = { variantId: "var-mug", quantity: 1 }; // stock 1: the last unit

describe("stock reservations", () => {
  it("T85: the last unit can be held by only one order; releasing the hold frees it", async () => {
    const { app, hold } = await setup();
    expect((await hold("order-a", [mug])).ok).toBe(true);
    expect(await hold("order-b", [mug])).toEqual({ ok: false, error: { variantId: "var-mug" } });

    await app.catalog.releaseReservations("order-a");
    expect((await hold("order-b", [mug])).ok).toBe(true);
  });

  it("T86: a hold expires on its own and the unit is available again", async () => {
    const { hold, advance } = await setup();
    expect((await hold("order-a", [mug], 15)).ok).toBe(true);
    advance(14);
    expect((await hold("order-b", [mug])).ok).toBe(false);
    advance(2); // 16 minutes: the hold has expired
    expect((await hold("order-b", [mug])).ok).toBe(true);
  });

  it("T87: committing a hold takes the stock for good; it is safe to commit twice", async () => {
    const { app, hold, stock } = await setup();
    await hold("order-a", [{ variantId: "var-kettle", quantity: 2 }]);
    expect(await stock("var-kettle")).toBe(5); // held, not yet sold

    expect((await app.catalog.commitReservations("order-a")).ok).toBe(true);
    expect(await stock("var-kettle")).toBe(3);
    expect((await app.catalog.commitReservations("order-a")).ok).toBe(true); // no double decrement
    expect(await stock("var-kettle")).toBe(3);
    // A committed reservation is not a hold any more, and releasing it does not give the stock back.
    await app.catalog.releaseReservations("order-a");
    expect(await stock("var-kettle")).toBe(3);
  });

  it("T88: a late commit after the hold expired still works if the unit is free, and fails if someone else holds it", async () => {
    const { app, hold, advance, stock } = await setup();
    await hold("order-a", [mug], 15);
    advance(20);
    expect((await app.catalog.commitReservations("order-a")).ok).toBe(true); // nobody else wanted it
    expect(await stock("var-mug")).toBe(0);

    const second = await setup();
    await second.hold("order-a", [mug], 15);
    second.advance(20);
    expect((await second.hold("order-b", [mug])).ok).toBe(true); // b took the unit after a's hold expired
    expect(await second.app.catalog.commitReservations("order-a")).toEqual({ ok: false, error: { variantId: "var-mug" } });
    expect(await second.stock("var-mug")).toBe(1); // nothing was taken for a
  });

  it("T89: a seller offer has its own stock, independent of the variant's", async () => {
    const { app, hold, stock } = await setup();
    const offerLine = (quantity: number) => ({ variantId: "var-kettle", quantity, offerId: "offer-kettle-nw" }); // offer stock 3
    expect((await hold("order-a", [offerLine(3)])).ok).toBe(true);
    expect((await hold("order-b", [offerLine(1)])).ok).toBe(false);
    expect((await hold("order-c", [{ variantId: "var-kettle", quantity: 5 }])).ok).toBe(true); // first-party stock untouched

    expect((await app.catalog.commitReservations("order-a")).ok).toBe(true);
    const offers = await app.catalog.listOffers(["var-kettle"]);
    expect(offers["var-kettle"].find((o) => o.offerId === "offer-kettle-nw")?.stock).toBe(0);
    expect(await stock("var-kettle")).toBe(5);
  });

  it("T90: reserving several lines is all-or-nothing", async () => {
    const { hold } = await setup();
    expect((await hold("order-a", [mug])).ok).toBe(true);
    // Line one is available, line two is not (the mug is held): neither line may be held.
    expect((await hold("order-b", [{ variantId: "var-kettle", quantity: 5 }, mug])).ok).toBe(false);
    expect((await hold("order-c", [{ variantId: "var-kettle", quantity: 5 }])).ok).toBe(true);
  });

  it("T91: two customers racing for the final unit: exactly one wins", async () => {
    const { hold } = await setup();
    const results = await Promise.all([hold("order-a", [mug]), hold("order-b", [mug])]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
  });
});
