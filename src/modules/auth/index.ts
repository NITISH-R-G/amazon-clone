// Public interface of the auth module. Import only from here.
export { createAuth } from "./internal/auth";
export type { AuthModule, AuthDeps } from "./internal/auth";
export { MIN_PASSWORD_LENGTH, SESSION_DAYS } from "./types";
export type { RegisterError, RegisterInput, Session, SignInError, SignInInput, User } from "./types";
