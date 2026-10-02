import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

/** PGlite extensions the schema needs (managed Postgres gets them through `CREATE EXTENSION` in the migrations). */
export const pgliteExtensions = { pg_trgm };
