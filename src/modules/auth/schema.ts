import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Stored trimmed and lower-cased; unique. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  /** `scrypt$<salt hex>$<hash hex>`; never returned by the module. */
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const sessions = pgTable("sessions", {
  /** SHA-256 of the cookie token, so a database leak does not leak live sessions. */
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
