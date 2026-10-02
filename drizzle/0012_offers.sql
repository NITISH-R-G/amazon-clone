CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"list_price_cents" integer,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"handling_minutes" integer DEFAULT 0 NOT NULL,
	"fulfilment" text DEFAULT 'seller' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "offers_stock_non_negative" CHECK ("offers"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_cart_variant";--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "offer_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "seller_name" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "fulfilment" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "offer_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_extra_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_variant_offer" UNIQUE("cart_id","variant_id","offer_id");