"use server";

// Thin orchestration (docs/modules.md rule 3): auth issues the session, then the app layer
// hands the guest's cart and orders to the account. Neither module knows about the other.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeReturnTo } from "@/lib/return-to";
import { MIN_PASSWORD_LENGTH } from "@/modules/auth";
import { clearGuestToken, readGuestActor } from "@/server/guest";
import { getApp } from "@/server/runtime";
import { clearSessionCookie, setSessionCookie } from "@/server/session";
import type { FormState } from "./form-state";

const authMessages: Record<string, string> = {
  INVALID_CREDENTIALS: "That email and password do not match. Check them and try again.",
  EMAIL_TAKEN: "An account with this email already exists. Sign in instead.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_NAME: "Enter your name.",
  WEAK_PASSWORD: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
};

const credentials = z.object({
  email: z.string().trim().min(1, "Enter your email address."),
  password: z.string().min(1, "Enter your password."),
  returnTo: z.string().optional(),
});

const registration = credentials.extend({ name: z.string().trim().min(1, "Enter your name.") });

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    const first = (messages as string[] | undefined)?.[0];
    if (first) out[key] = first;
  }
  return out;
}

async function startSession(userId: string, token: string, expiresAt: Date) {
  const app = await getApp();
  await setSessionCookie(token, expiresAt);
  const guest = await readGuestActor();
  if (guest && "guestToken" in guest) {
    await app.cart.mergeGuestCart(guest.guestToken, userId);
    await app.orders.claimGuestOrders(guest.guestToken, userId);
    await clearGuestToken();
  }
  revalidatePath("/", "layout");
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const values = { email: String(raw.email ?? "") };
  const parsed = credentials.safeParse(raw);
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };

  const app = await getApp();
  const result = await app.auth.signIn({ email: parsed.data.email, password: parsed.data.password });
  if (!result.ok) return { error: authMessages[result.error], values };
  await startSession(result.value.user.id, result.value.token, result.value.expiresAt);
  redirect(safeReturnTo(parsed.data.returnTo));
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  const parsed = registration.safeParse(raw);
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };

  const app = await getApp();
  const created = await app.auth.register(parsed.data);
  if (!created.ok) {
    const field = created.error === "EMAIL_TAKEN" || created.error === "INVALID_EMAIL" ? "email" : created.error === "WEAK_PASSWORD" ? "password" : "name";
    return { error: authMessages[created.error], fieldErrors: { [field]: authMessages[created.error] }, values };
  }
  const session = await app.auth.signIn({ email: parsed.data.email, password: parsed.data.password });
  if (!session.ok) return { error: authMessages.INVALID_CREDENTIALS, values };
  await startSession(session.value.user.id, session.value.token, session.value.expiresAt);
  redirect(safeReturnTo(parsed.data.returnTo));
}

export async function signOutAction(): Promise<void> {
  const token = await clearSessionCookie();
  if (token) await (await getApp()).auth.signOut(token);
  revalidatePath("/", "layout");
  redirect("/");
}
