// Deploy-time database preparation: apply migrations, then seed an empty catalogue.
// Idempotent. Run by the Vercel build (`vercel-build`) and by hand: `pnpm db:setup`.
// Uses DATABASE_URL when set; without it there is nothing to prepare (PGlite prepares itself).
import { seedDemoCatalog } from "@/db/seed-demo";
import { seedDemoExtras } from "@/db/seed-reviews";
import { openDatabase } from "@/server/database";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    if (process.env.VERCEL) throw new Error("DATABASE_URL is not set for this Vercel build.");
    console.log("db:setup skipped: no DATABASE_URL (PGlite prepares itself at start-up).");
    return;
  }
  const started = Date.now();
  const handle = await openDatabase();
  try {
    await handle.migrate();
    await seedDemoCatalog(handle.db);
    await seedDemoExtras(handle.db);
    console.log(`db:setup done in ${Date.now() - started} ms`);
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  // Never print the connection string: report only the error message.
  console.error("db:setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
