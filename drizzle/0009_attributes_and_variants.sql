CREATE TABLE "attribute_defs" (
	"id" text PRIMARY KEY NOT NULL,
	"type_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"role" text NOT NULL,
	"facet" boolean DEFAULT false NOT NULL,
	"values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "attribute_defs_type_key" UNIQUE("type_id","key")
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "type_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "selections" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "attribute_defs" ADD CONSTRAINT "attribute_defs_type_id_product_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_type_id_product_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_sku_unique" UNIQUE("sku");