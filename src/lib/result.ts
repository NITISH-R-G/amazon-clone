/** Expected failures are values; bugs throw. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Who is acting: a signed-in user or an anonymous guest cart token. */
export type Actor = { userId: string } | { guestToken: string };

export function actorKey(actor: Actor): string {
  return "userId" in actor ? `user:${actor.userId}` : `guest:${actor.guestToken}`;
}
