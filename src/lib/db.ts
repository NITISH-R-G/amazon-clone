import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/**
 * Schema-agnostic database handle. Both a Drizzle database and a transaction
 * (including a savepoint) satisfy it, so module functions that take
 * `DbOrTx` participate in the caller's transaction. `any` is deliberate: modules
 * address only their own tables through the query builder, never the aggregate schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbOrTx = PgDatabase<PgQueryResultHKT, any>;
