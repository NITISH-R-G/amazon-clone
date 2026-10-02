DROP INDEX IF EXISTS "products_search_idx";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "search";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("title", '')), 'A') || setweight(to_tsvector('simple', coalesce("brand", '')), 'B') || setweight(jsonb_to_tsvector('simple', "attributes", '["string"]'), 'C') || setweight(to_tsvector('simple', coalesce("description", '')), 'D')) STORED;--> statement-breakpoint
CREATE INDEX "products_search_idx" ON "products" USING gin ("search");--> statement-breakpoint
CREATE INDEX "products_attributes_idx" ON "products" USING gin ("attributes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" ("type_id");
