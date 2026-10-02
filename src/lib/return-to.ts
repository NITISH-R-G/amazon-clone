/** Only same-site paths: absolute or protocol-relative URLs fall back to the default (no open redirect). */
export function safeReturnTo(value: unknown, fallback = "/orders"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : fallback;
}
