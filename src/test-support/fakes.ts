import type { Clock, IdGenerator } from "@/lib/ports";
import type { PaymentProvider, PaymentRequest, PaymentResult } from "@/modules/payments";

/** The three allowed fakes (docs/modules.md): Clock, IdGenerator, PaymentProvider. */

export function fixedClock(iso: string): Clock {
  return { now: () => new Date(iso) };
}

export function fixedIds(opts: { orderNumbers: string[]; tokens?: string[] }): IdGenerator {
  const orders = [...opts.orderNumbers];
  const tokens = [...(opts.tokens ?? [])];
  let seq = 0;
  return {
    orderNumber: () => orders.shift() ?? `ORD-AUTO-${++seq}`,
    token: () => tokens.shift() ?? `token-${++seq}`,
  };
}

export type FakePaymentProvider = PaymentProvider & { calls: PaymentRequest[] };

export function fakePaymentProvider(result: PaymentResult): FakePaymentProvider {
  const calls: PaymentRequest[] = [];
  return {
    calls,
    authorize: async (request) => {
      calls.push(request);
      return result;
    },
  };
}
