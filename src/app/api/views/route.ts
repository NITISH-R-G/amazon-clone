import { NextResponse } from "next/server";
import { z } from "zod";
import { createSystemIds } from "@/lib/ports";
import { getApp } from "@/server/runtime";
import { ensureViewer } from "@/server/viewer";

export const runtime = "nodejs";

/** Records that the visitor looked at a product. A plain request (not a server action) so the page is not re-rendered. */
export async function POST(request: Request) {
  const body = z.object({ productId: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false }, { status: 400 });
  const actor = await ensureViewer(() => createSystemIds().token());
  await (await getApp()).discovery.recordView(actor, body.data.productId);
  return NextResponse.json({ ok: true });
}
