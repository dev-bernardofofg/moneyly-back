ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "last_import_from" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "last_import_through" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "last_import_due_date" timestamp;
