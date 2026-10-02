import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import type { Clock, IdGenerator } from "@/lib/ports";
import { err, ok, type Result } from "@/lib/result";
import { sessions, users } from "../schema";
import {
  MIN_PASSWORD_LENGTH,
  SESSION_DAYS,
  type RegisterError,
  type RegisterInput,
  type Session,
  type SignInError,
  type SignInInput,
  type User,
} from "../types";
import { hashPassword, verifyPassword } from "./password";

export type AuthDeps = { db: DbOrTx; clock: Clock; ids: IdGenerator };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normaliseEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Hashed once so an unknown email costs the same as a wrong password.
const DUMMY_HASH = hashPassword("not-a-real-password");

export function createAuth({ db, clock, ids }: AuthDeps) {
  async function register(input: RegisterInput): Promise<Result<User, RegisterError>> {
    const name = input.name.trim();
    const email = normaliseEmail(input.email);
    if (!name) return err("INVALID_NAME");
    if (!EMAIL_PATTERN.test(email)) return err("INVALID_EMAIL");
    if (input.password.length < MIN_PASSWORD_LENGTH) return err("WEAK_PASSWORD");

    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (taken) return err("EMAIL_TAKEN");

    const passwordHash = await hashPassword(input.password);
    const [row] = await db
      .insert(users)
      .values({ email, name, passwordHash, createdAt: clock.now() })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id, email: users.email, name: users.name });
    return row ? ok(row) : err("EMAIL_TAKEN");
  }

  async function signIn(input: SignInInput): Promise<Result<Session, SignInError>> {
    const [row] = await db.select().from(users).where(eq(users.email, normaliseEmail(input.email))).limit(1);
    const valid = await verifyPassword(input.password, row?.passwordHash ?? (await DUMMY_HASH));
    if (!row || !valid) return err("INVALID_CREDENTIALS");

    const token = ids.token();
    const expiresAt = new Date(clock.now().getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({ tokenHash: hashToken(token), userId: row.id, expiresAt });
    return ok({ user: { id: row.id, email: row.email, name: row.name }, token, expiresAt });
  }

  /** The user behind a session cookie, or null if it is unknown, signed out or expired. */
  async function getUser(token: string): Promise<User | null> {
    const [row] = await db
      .select({ id: users.id, email: users.email, name: users.name, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, hashToken(token)))
      .limit(1);
    if (!row || row.expiresAt.getTime() <= clock.now().getTime()) return null;
    return { id: row.id, email: row.email, name: row.name };
  }

  async function signOut(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }

  return { register, signIn, getUser, signOut };
}

export type AuthModule = ReturnType<typeof createAuth>;
