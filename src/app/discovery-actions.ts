"use server";

import { z } from "zod";
import { createSystemIds } from "@/lib/ports";
import { getApp } from "@/server/runtime";
import { ensureActor } from "@/server/session";

/** Notes that the visitor looked at a product (signed-in user, or a guest identified by the cart cookie). */
export async function recordViewAction(productId: string): Promise<void> {
  const parsed = z.string().min(1).max(100).safeParse(productId);
  if (!parsed.success) return;
  const actor = await ensureActor(() => createSystemIds().token());
  await (await getApp()).discovery.recordView(actor, parsed.data);
}
