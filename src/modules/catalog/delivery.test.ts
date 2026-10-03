import { describe, expect, it } from "vitest";
import { deliveryPromise, slowestPromise, transitDays } from "./delivery";

const at = (iso: string) => new Date(iso);

describe("delivery promise (deterministic)", () => {
  it("T110: a Cartly offer ordered on a weekday before the cut-off ships that day", () => {
    // Mon 2026-10-05 10:00 UTC, ZIP 1xxxx (2 transit days) -> ships Mon, arrives Wed - Thu.
    const p = deliveryPromise({ now: at("2026-10-05T10:00:00Z"), fulfilment: "cartly", handlingMinutes: 15, postalCode: "10001" });
    expect(p.shipsOn.toISOString().slice(0, 10)).toBe("2026-10-05");
    expect(p.label).toBe("Wed, Oct 7 - Thu, Oct 8");
  });

  it("T111: after the cut-off, or on a weekend, processing starts on the next business day", () => {
    const late = deliveryPromise({ now: at("2026-10-05T16:00:00Z"), fulfilment: "cartly", handlingMinutes: 0, postalCode: "10001" });
    expect(late.shipsOn.toISOString().slice(0, 10)).toBe("2026-10-06");
    const saturday = deliveryPromise({ now: at("2026-10-03T09:00:00Z"), fulfilment: "cartly", handlingMinutes: 0, postalCode: "10001" });
    expect(saturday.shipsOn.toISOString().slice(0, 10)).toBe("2026-10-05");
  });

  it("T112: seller fulfilment adds a business day, plus one per 12 hours of stated handling", () => {
    const base = { now: at("2026-10-05T10:00:00Z"), postalCode: "10001" };
    const cartly = deliveryPromise({ ...base, fulfilment: "cartly", handlingMinutes: 0 });
    const seller = deliveryPromise({ ...base, fulfilment: "seller", handlingMinutes: 60 });
    const slow = deliveryPromise({ ...base, fulfilment: "seller", handlingMinutes: 720 });
    expect(seller.earliest.getTime() - cartly.earliest.getTime()).toBe(86_400_000);
    expect(slow.earliest.getTime() - seller.earliest.getTime()).toBe(86_400_000);
  });

  it("T113: the destination sets transit time; weekends are skipped; the slowest line decides", () => {
    expect([transitDays("02139"), transitDays("60601"), transitDays("94105"), transitDays(null), transitDays("")]).toEqual([2, 3, 4, 3, 3]);
    const now = at("2026-10-07T10:00:00Z"); // Wednesday
    const east = deliveryPromise({ now, fulfilment: "cartly", handlingMinutes: 0, postalCode: "10001" });
    const west = deliveryPromise({ now, fulfilment: "cartly", handlingMinutes: 0, postalCode: "94105" });
    expect(east.earliest.toISOString().slice(0, 10)).toBe("2026-10-09"); // Fri
    expect(west.earliest.toISOString().slice(0, 10)).toBe("2026-10-13"); // Tue: Sat/Sun/Mon skipped past the weekend
    expect([east.earliest, east.latest, west.earliest, west.latest].every((d) => ![0, 6].includes(d.getUTCDay()))).toBe(true);
    expect(slowestPromise([east, west])).toBe(west);
    expect(slowestPromise([])).toBeNull();
  });
});
