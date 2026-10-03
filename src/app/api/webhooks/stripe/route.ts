import { NextResponse } from "next/server";
import { processPaymentWebhook } from "@/server/payment-webhook";
import { getApp } from "@/server/runtime";

// Signature verification needs the exact raw body and the Node crypto module.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const result = await processPaymentWebhook(await getApp(), raw, request.headers.get("stripe-signature"));
  return NextResponse.json(result.body, { status: result.status });
}
