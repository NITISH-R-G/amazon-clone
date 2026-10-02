import { describe, expect, it } from "vitest";
import type { Clock } from "@/lib/ports";
import { createTestApp } from "@/test-support/app";

const ada = { name: "Ada Lovelace", email: "ada@example.test", password: "correct horse battery" };

describe("auth", () => {
  it("T36: registering creates a user whose email is normalised", async () => {
    const app = await createTestApp();
    const result = await app.auth.register({ ...ada, email: "  Ada@Example.TEST " });
    expect(result).toMatchObject({ ok: true, value: { name: "Ada Lovelace", email: "ada@example.test" } });
  });

  it("T37: a duplicate email, a bad email and a weak password are refused with a reason", async () => {
    const app = await createTestApp();
    await app.auth.register(ada);
    expect(await app.auth.register({ ...ada, email: "ADA@example.test" })).toEqual({ ok: false, error: "EMAIL_TAKEN" });
    expect(await app.auth.register({ ...ada, email: "not-an-email" })).toEqual({ ok: false, error: "INVALID_EMAIL" });
    expect(await app.auth.register({ ...ada, email: "b@example.test", password: "short" })).toEqual({
      ok: false,
      error: "WEAK_PASSWORD",
    });
    expect(await app.auth.register({ ...ada, email: "c@example.test", name: " " })).toEqual({
      ok: false,
      error: "INVALID_NAME",
    });
  });

  it("T38: signing in returns a session that resolves to the user until sign-out", async () => {
    const app = await createTestApp();
    await app.auth.register(ada);
    const signedIn = await app.auth.signIn({ email: "ADA@example.test", password: ada.password });
    if (!signedIn.ok) throw new Error("sign-in failed");

    expect((await app.auth.getUser(signedIn.value.token))?.email).toBe("ada@example.test");
    await app.auth.signOut(signedIn.value.token);
    expect(await app.auth.getUser(signedIn.value.token)).toBeNull();
  });

  it("T39: a wrong password and an unknown email give the same generic error", async () => {
    const app = await createTestApp();
    await app.auth.register(ada);
    const wrong = await app.auth.signIn({ email: ada.email, password: "nope nope nope" });
    const unknown = await app.auth.signIn({ email: "who@example.test", password: ada.password });
    expect(wrong).toEqual({ ok: false, error: "INVALID_CREDENTIALS" });
    expect(unknown).toEqual(wrong);
  });

  it("T40: a session stops working after it expires", async () => {
    let now = new Date("2026-10-03T12:00:00Z");
    const clock: Clock = { now: () => now };
    const app = await createTestApp({ clock });
    await app.auth.register(ada);
    const signedIn = await app.auth.signIn({ email: ada.email, password: ada.password });
    if (!signedIn.ok) throw new Error("sign-in failed");

    now = new Date(signedIn.value.expiresAt.getTime() - 1000);
    expect(await app.auth.getUser(signedIn.value.token)).not.toBeNull();
    now = new Date(signedIn.value.expiresAt.getTime() + 1000);
    expect(await app.auth.getUser(signedIn.value.token)).toBeNull();
  });
});
