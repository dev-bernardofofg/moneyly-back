ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "external_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_external_id_unique" UNIQUE("user_id","external_id");
