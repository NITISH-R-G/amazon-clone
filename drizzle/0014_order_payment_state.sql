CREATE TABLE "payment_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"brand" text,
	"last4" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "payments_provider_ref_unique" UNIQUE("provider_ref")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"order_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_ref" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_reference" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_brand" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_last4" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "hold_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_status" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Orders created before two-phase checkout were paid at creation.
UPDATE "orders" SET "paid_at" = "placed_at" WHERE "paid_at" IS NULL;
