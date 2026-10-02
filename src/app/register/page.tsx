import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeReturnTo } from "@/lib/return-to";
import { readUser } from "@/server/session";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const returnTo = safeReturnTo(typeof sp.returnTo === "string" ? sp.returnTo : undefined);
  if (await readUser()) redirect(returnTo);

  return (
    <div className="mx-auto max-w-sm space-y-8 py-8">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">Create your account</h1>
        <p className="text-muted-foreground">Track orders and keep your cart across visits. Demo store: no email is sent.</p>
      </div>
      <AuthForm mode="register" returnTo={returnTo} />
    </div>
  );
}
