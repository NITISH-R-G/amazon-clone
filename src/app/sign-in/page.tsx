import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeReturnTo } from "@/lib/return-to";
import { readUser } from "@/server/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const returnTo = safeReturnTo(typeof sp.returnTo === "string" ? sp.returnTo : undefined);
  if (await readUser()) redirect(returnTo);

  return (
    <div className="mx-auto max-w-sm space-y-8 py-8">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">Sign in</h1>
        <p className="text-muted-foreground">Your cart and any guest orders from this browser come with you.</p>
      </div>
      <AuthForm mode="sign-in" returnTo={returnTo} />
    </div>
  );
}
