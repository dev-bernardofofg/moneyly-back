CREATE TABLE IF NOT EXISTS "bill_payment_outflows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "amount" integer NOT NULL,
  "date" timestamp NOT NULL,
  "external_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bill_payment_outflows_user_external_unique" ON "bill_payment_outflows" ("user_id", "external_id");
