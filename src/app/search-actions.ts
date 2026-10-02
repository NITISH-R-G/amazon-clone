"use server";

import { getApp } from "@/server/runtime";
import type { Suggestion } from "@/modules/search";

/** Suggestions for the header search box (thin wrapper over `search.suggest`). */
export async function suggestAction(text: string): Promise<Suggestion[]> {
  if (typeof text !== "string" || text.length > 80) return [];
  return (await getApp()).search.suggest(text, 6);
}
