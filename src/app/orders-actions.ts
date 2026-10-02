"use server";

// Thin orchestration: validate input, call `checkout.cancelOrder`, translate the result into a redirect.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeReturnTo } from "@/lib/return-to";
import { getApp } from "@/server/runtime";
import { readActor } from "@/server/session";

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const parsed = z.object({ orderId: z.uuid(), returnTo: z.string().optional() }).safeParse(Object.fromEntries(formData));
  const actor = await readActor();
  if (!parsed.success || !actor) redirect("/orders");

  const back = safeReturnTo(parsed.data.returnTo, "/orders");
  const result = await (await getApp()).checkout.cancelOrder(actor, parsed.data.orderId);
  revalidatePath("/", "layout");
  if (!result.ok) redirect(`${back}${back.includes("?") ? "&" : "?"}cancel=${result.error === "NOT_FOUND" ? "missing" : "late"}`);
  redirect(back);
}
