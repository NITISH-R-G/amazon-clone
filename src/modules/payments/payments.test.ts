import { describe, expect, it } from "vitest";
import { fixedClock, fixedIds } from "@/test-support/fakes";
import { createDemoProvider, validateCardFormat } from "@/modules/payments";

const now = new Date("2026-10-03T12:00:00Z");

describe("payments (demo adapter)", () => {
  it("T13: validates card format and approves/declines per the demo rules", async () => {
    expect(validateCardFormat({ number: "4242424242424242", expiry: "12/30", cvc: "123" }, now)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(validateCardFormat({ number: "4242424242424241", expiry: "12/30", cvc: "123" }, now).ok).toBe(false);

    const provider = createDemoProvider({
      clock: fixedClock("2026-10-03T12:00:00Z"),
      ids: fixedIds({ orderNumbers: [], tokens: ["ref-1"] }),
    });

    expect(
      await provider.authorize({
        amountCents: 6478,
        card: { number: "4242424242424242", expiry: "12/30", cvc: "123" },
        idempotencyKey: "k1",
      }),
    ).toEqual({ status: "approved", reference: "ref-1", brand: "visa", last4: "4242" });

    expect(
      await provider.authorize({
        amountCents: 6478,
        card: { number: "4000000000000002", expiry: "12/30", cvc: "123" },
        idempotencyKey: "k2",
      }),
    ).toEqual({ status: "declined", reason: "card_declined" });
  });
});
