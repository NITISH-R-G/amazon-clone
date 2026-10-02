export type User = { id: string; email: string; name: string };

export type RegisterInput = { name: string; email: string; password: string };
export type SignInInput = { email: string; password: string };

export type RegisterError = "INVALID_NAME" | "INVALID_EMAIL" | "WEAK_PASSWORD" | "EMAIL_TAKEN";
export type SignInError = "INVALID_CREDENTIALS";

/** `token` goes in the cookie; only its hash is stored. */
export type Session = { user: User; token: string; expiresAt: Date };

export const SESSION_DAYS = 30;
export const MIN_PASSWORD_LENGTH = 8;
