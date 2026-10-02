"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { registerAction, signInAction } from "@/app/auth-actions";
import type { FormState } from "@/app/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign-in" | "register";

const copy = {
  "sign-in": {
    title: "Sign in",
    submit: "Sign in",
    pending: "Signing in...",
    switchText: "New here?",
    switchLink: "Create an account",
    switchHref: "/register",
  },
  register: {
    title: "Create your account",
    submit: "Create account",
    pending: "Creating account...",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

export function AuthForm({ mode, returnTo }: { mode: Mode; returnTo: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mode === "sign-in" ? signInAction : registerAction,
    {},
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  const c = copy[mode];

  // After a failed submit, bring the error into view and announce it.
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);

  const field = (name: string, label: string, props: React.ComponentProps<typeof Input>) => {
    const error = state.fieldErrors?.[name];
    return (
      <div>
        <Label htmlFor={name} className="mb-1.5">
          {label}
        </Label>
        <Input
          id={name}
          name={name}
          required
          defaultValue={state.values?.[name]}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${name}-error`} className="mt-1 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.error ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm font-medium text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      {mode === "register" ? field("name", "Name", { autoComplete: "name" }) : null}
      {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email" })}
      {field("password", "Password", {
        type: "password",
        autoComplete: mode === "sign-in" ? "current-password" : "new-password",
      })}
      {mode === "register" ? <p className="-mt-3 text-sm text-muted-foreground">At least 8 characters.</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? c.pending : c.submit}
      </Button>
      <p className="text-sm text-muted-foreground">
        {c.switchText}{" "}
        <Link
          href={`${c.switchHref}?returnTo=${encodeURIComponent(returnTo)}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {c.switchLink}
        </Link>
      </p>
    </form>
  );
}
