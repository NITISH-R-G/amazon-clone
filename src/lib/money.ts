/** Money is integer cents (USD). Never floats. */
export type Cents = number;

/** "$1,234.56" for display only; arithmetic stays in cents. */
export function formatUsd(cents: Cents): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `$${whole.toLocaleString("en-US")}.${fraction}`;
}

/** Split for price typography: whole dollars and two-digit cents. */
export function splitUsd(cents: Cents): { whole: string; fraction: string } {
  return {
    whole: Math.trunc(cents / 100).toLocaleString("en-US"),
    fraction: String(cents % 100).padStart(2, "0"),
  };
}
