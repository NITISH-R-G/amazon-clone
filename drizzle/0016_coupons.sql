CREATE TABLE "promotions" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal_cents" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text;--> statement-breakpoint
-- Demo coupons (invented). One is deliberately expired so the error path is visible.
INSERT INTO "promotions" ("code", "label", "kind", "value", "min_subtotal_cents", "starts_at", "ends_at") VALUES
  ('SAVE10', '10% off your items', 'percent', 10, 5000, '2026-01-01T00:00:00Z', '2028-12-31T00:00:00Z'),
  ('WELCOME5', '$5 off your first order', 'fixed', 500, 2500, '2026-01-01T00:00:00Z', '2028-12-31T00:00:00Z'),
  ('SPRING20', '20% off (spring sale)', 'percent', 20, 0, '2026-03-01T00:00:00Z', '2026-04-01T00:00:00Z');
