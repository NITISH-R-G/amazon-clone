// Pure delivery promise (no database, no clock). Importable from client components as "@/modules/catalog/delivery".
//
// The rule (invented for this store, not Amazon's):
//  - Orders placed before the 15:00 UTC cut-off on a weekday are processed that day; later ones, and weekends,
//    start on the next business day.
//  - Cartly-fulfilled offers ship the day processing starts. Seller-fulfilled offers take one more business day,
//    plus one for every 12 hours of the seller's stated handling time.
//  - Transit takes 2, 3 or 4 business days by destination (ZIP first digit 0-3, 4-6, 7-9; unknown: 3) and is shown
//    as a one-day window ("Tue, Oct 6 - Wed, Oct 7") unless it is a single day.
//  - Weekends are never delivery days.

import type { Fulfilment } from "./offers";

export const CUTOFF_HOUR_UTC = 15;
const DAY = 86_400_000;

export type DeliveryInput = {
  now: Date;
  fulfilment: Fulfilment;
  /** The seller's handling time; first-party offers use 0. */
  handlingMinutes: number;
  /** Destination ZIP; null/empty when not yet known. */
  postalCode?: string | null;
};

export type DeliveryPromise = {
  /** The day the parcel leaves. */
  shipsOn: Date;
  earliest: Date;
  latest: Date;
  /** "Tue, Oct 6" or "Tue, Oct 6 - Wed, Oct 7". */
  label: string;
};

const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

function nextBusinessDay(d: Date): Date {
  let out = new Date(d.getTime());
  while (isWeekend(out)) out = new Date(out.getTime() + DAY);
  return out;
}

export function addBusinessDays(d: Date, days: number): Date {
  let out = nextBusinessDay(d);
  for (let left = days; left > 0; left--) out = nextBusinessDay(new Date(out.getTime() + DAY));
  return out;
}

export function transitDays(postalCode?: string | null): number {
  const first = (postalCode ?? "").trim()[0];
  if (!first || first < "0" || first > "9") return 3;
  const n = Number(first);
  return n <= 3 ? 2 : n <= 6 ? 3 : 4;
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function deliveryPromise({ now, fulfilment, handlingMinutes, postalCode }: DeliveryInput): DeliveryPromise {
  const afterCutoff = now.getUTCHours() >= CUTOFF_HOUR_UTC;
  const processingStart = nextBusinessDay(startOfUtcDay(afterCutoff ? new Date(now.getTime() + DAY) : now));
  const extraDays = fulfilment === "cartly" ? 0 : 1 + Math.floor(handlingMinutes / 720);
  const shipsOn = addBusinessDays(processingStart, extraDays);
  const earliest = addBusinessDays(shipsOn, transitDays(postalCode));
  const latest = addBusinessDays(earliest, 1);
  return { shipsOn, earliest, latest, label: `${formatDay(earliest)} - ${formatDay(latest)}` };
}

/** The promise for a whole order: the slowest line decides. */
export function slowestPromise(promises: DeliveryPromise[]): DeliveryPromise | null {
  if (promises.length === 0) return null;
  return promises.reduce((worst, p) => (p.latest > worst.latest ? p : worst));
}
