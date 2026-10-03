CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offers_variant_idx" ON "offers" ("variant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_rating_idx" ON "products" ("rating_tenths" DESC, "rating_count" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_owner_placed_idx" ON "orders" ("owner_key", "placed_at" DESC);
