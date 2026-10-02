import type { Clock, IdGenerator } from "@/lib/ports";
import type { PaymentProvider } from "../types";
import { cardBrand, cardDigits, validateCardFormat } from "./card";

/** Published demo number that is always declined. */
const DECLINE_NUMBER = "4000000000000002";

/**
 * Demo provider: no money moves and no card data is stored. Approves any
 * well-formed card except the designated decline number.
 */
export function createDemoProvider({ clock, ids }: { clock: Clock; ids: IdGenerator }): PaymentProvider {
  return {
    async authorize({ amountCents, card }) {
      if (amountCents <= 0) return { status: "declined", reason: "invalid_amount" };
      const digits = cardDigits(card.number);
      if (digits === DECLINE_NUMBER) return { status: "declined", reason: "card_declined" };
      const format = validateCardFormat(card, clock.now());
      if (!format.ok) return { status: "declined", reason: "invalid_card" };
      return { status: "approved", reference: ids.token(), brand: cardBrand(digits), last4: digits.slice(-4) };
    },
  };
}
