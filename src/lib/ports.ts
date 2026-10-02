// External ports. These (plus PaymentProvider in modules/payments) are the only
// things faked in tests; everything else runs for real.

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  /** Human-facing order number, unique per order. */
  orderNumber(): string;
  /** Opaque random token (guest cart token, payment reference). */
  token(): string;
}

export const systemClock: Clock = { now: () => new Date() };

export function createSystemIds(): IdGenerator {
  return {
    orderNumber: () =>
      `AR-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    token: () => crypto.randomUUID().replaceAll("-", ""),
  };
}
