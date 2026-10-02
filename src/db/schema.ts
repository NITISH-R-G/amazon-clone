// Aggregate schema for drizzle-kit and the runtime database. This file is the
// composition root's only reach into modules' schema files (not their internals).
export * from "@/modules/catalog/schema";
export * from "@/modules/cart/schema";
export * from "@/modules/orders/schema";
