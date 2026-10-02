import { err, ok, type Result } from "@/lib/result";
import type { CardInput } from "../types";

export type CardFormatError = "INVALID_NUMBER" | "INVALID_EXPIRY" | "INVALID_CVC";

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function cardDigits(number: string): string {
  return number.replace(/[\s-]/g, "");
}

export function cardBrand(digits: string): string {
  if (digits.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "card";
}

/** Pure format checks (Luhn, expiry not in the past, CVC length). `now` comes from the Clock. */
export function validateCardFormat(card: CardInput, now: Date): Result<void, CardFormatError> {
  const digits = cardDigits(card.number);
  if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) return err("INVALID_NUMBER");

  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiry.trim());
  if (!match) return err("INVALID_EXPIRY");
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  // A card is valid through the last day of its expiry month.
  const expiresAt = new Date(Date.UTC(year, month, 1));
  if (expiresAt.getTime() <= now.getTime()) return err("INVALID_EXPIRY");

  if (!/^\d{3,4}$/.test(card.cvc)) return err("INVALID_CVC");
  return ok(undefined);
}
