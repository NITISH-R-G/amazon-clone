CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"offer_id" text DEFAULT '' NOT NULL,
	"quantity" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_reservations_order_unit" UNIQUE("order_id","variant_id","offer_id"),
	CONSTRAINT "stock_reservations_quantity_positive" CHECK ("stock_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX "stock_reservations_unit_idx" ON "stock_reservations" USING btree ("variant_id","offer_id","status");