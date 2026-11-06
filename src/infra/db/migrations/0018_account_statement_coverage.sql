ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "data_through" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "statement_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_user_statement_key_unique" ON "accounts" ("user_id", "statement_key") WHERE "statement_key" is not null;
