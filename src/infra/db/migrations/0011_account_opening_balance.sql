ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "opening_balance_date" timestamp;
