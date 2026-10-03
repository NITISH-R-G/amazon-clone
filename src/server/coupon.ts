import { cookies } from "next/headers";

const COOKIE = "coupon";

/** The coupon code the visitor applied, if any. It is only a code: the discount is computed from the database. */
export async function readCoupon(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value || null;
}

/** Server actions only. */
export async function setCoupon(code: string): Promise<void> {
  (await cookies()).set(COOKIE, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
}

/** Server actions only. */
export async function clearCoupon(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
