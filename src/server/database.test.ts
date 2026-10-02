import { describe, expect, it } from "vitest";
import { selectDriver } from "./database";

describe("database driver selection", () => {
  it("T48: managed Postgres only when DATABASE_URL is set; PGlite otherwise; never PGlite on Vercel", () => {
    expect(selectDriver({ DATABASE_URL: "postgres://u:p@host/db" })).toBe("postgres");
    expect(selectDriver({})).toBe("pglite");
    expect(selectDriver({ DATABASE_URL: "   " })).toBe("pglite");
    expect(selectDriver({ DATABASE_URL: "postgres://u:p@host/db", VERCEL: "1" })).toBe("postgres");
    // PGlite would silently lose state on serverless: refuse to start instead.
    expect(() => selectDriver({ VERCEL: "1" })).toThrow(/DATABASE_URL/);
  });
});
