CREATE TABLE "product_views" (
	"owner_key" text NOT NULL,
	"product_id" text NOT NULL,
	"viewed_at" timestamp with time zone NOT NULL,
	"views" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "product_views_owner_key_product_id_pk" PRIMARY KEY("owner_key","product_id")
);
--> statement-breakpoint
CREATE INDEX "product_views_owner_recent" ON "product_views" USING btree ("owner_key","viewed_at");