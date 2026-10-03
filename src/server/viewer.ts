import { cookies } from "next/headers";
import type { Actor } from "@/lib/result";
import { readUser } from "./session";

// Browsing history belongs to a separate, long-lived cookie, not to the cart's guest token: recording a view must never
// race with creating or merging a cart.
const COOKIE = "viewer_id";

/** Who is browsing: the signed-in user, else the anonymous browser id, else nobody yet. */
export async function readViewer(): Promise<Actor | null> {
  const user = await readUser();
  if (user) return { userId: user.id };
  const id = (await cookies()).get(COOKIE)?.value;
  return id ? { guestToken: `v-${id}` } : null;
}

/** Route handlers and server actions only: like `readViewer`, but creates the browser id when there is nobody yet. */
export async function ensureViewer(newToken: () => string): Promise<Actor> {
  const user = await readUser();
  if (user) return { userId: user.id };
  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  if (!id) {
    id = newToken();
    jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 });
  }
  return { guestToken: `v-${id}` };
}

/** The anonymous browser id's actor token, for claiming its history on sign-in. */
export async function readViewerToken(): Promise<string | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  return id ? `v-${id}` : null;
}

/** Server actions only. */
export async function clearViewer(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
