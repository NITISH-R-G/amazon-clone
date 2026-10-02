import { cookies } from "next/headers";
import type { Actor } from "@/lib/result";

const COOKIE = "guest_token";

/** The guest actor for this request, or null if the visitor has no cart yet. */
export async function readGuestActor(): Promise<Actor | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? { guestToken: token } : null;
}

/** Server actions only: reads the guest token or creates one. */
export async function ensureGuestActor(newToken: () => string): Promise<Actor> {
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;
  if (!token) {
    token = newToken();
    jar.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return { guestToken: token };
}

/** Server actions only: forgets the guest token once its cart and orders belong to an account. */
export async function clearGuestToken(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
