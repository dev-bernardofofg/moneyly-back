CREATE TABLE IF NOT EXISTS "transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "from_account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "to_account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "amount" integer NOT NULL,
  "date" timestamp NOT NULL,
  "description" text,
  "from_external_id" text,
  "to_external_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_user_date_idx" ON "transfers" ("user_id", "date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transfers_user_from_external_unique" ON "transfers" ("user_id", "from_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transfers_user_to_external_unique" ON "transfers" ("user_id", "to_external_id");
