// Aggregate schema for drizzle-kit and the runtime database. This file is the
// composition root's only reach into modules' schema files (not their internals).
export * from "@/modules/catalog/schema";
export * from "@/modules/cart/schema";
export * from "@/modules/orders/schema";
export * from "@/modules/auth/schema";
export * from "@/modules/payments/schema";
export * from "@/modules/discovery/schema";
export * from "@/modules/checkout/schema";
