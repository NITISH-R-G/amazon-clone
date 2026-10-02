import { cookies } from "next/headers";
import type { Actor } from "@/lib/result";
import type { User } from "@/modules/auth";
import { ensureGuestActor, readGuestActor } from "./guest";
import { getApp } from "./runtime";

const COOKIE = "session";

/** The signed-in user for this request, or null. An expired or unknown cookie counts as signed out. */
export async function readUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return (await getApp()).auth.getUser(token);
}

/** Who is acting: the signed-in user, else the guest with a cart cookie, else nobody yet. */
export async function readActor(): Promise<Actor | null> {
  const user = await readUser();
  return user ? { userId: user.id } : readGuestActor();
}

/** Server actions only: like `readActor`, but creates a guest cart token when there is nobody yet. */
export async function ensureActor(newToken: () => string): Promise<Actor> {
  const user = await readUser();
  return user ? { userId: user.id } : ensureGuestActor(newToken);
}

/** Server actions only. */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Server actions only. Returns the token that was cleared, if any. */
export async function clearSessionCookie(): Promise<string | undefined> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  return token;
}
