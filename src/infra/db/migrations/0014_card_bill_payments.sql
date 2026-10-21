CREATE TABLE IF NOT EXISTS "card_bill_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "due_date" timestamp NOT NULL,
  "source" text NOT NULL,
  "paid_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "card_bill_payments_account_due_unique" ON "card_bill_payments" ("account_id", "due_date");
