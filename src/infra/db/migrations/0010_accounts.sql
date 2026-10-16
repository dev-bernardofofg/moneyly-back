CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"closing_day" integer,
	"due_day" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_user_default_unique" ON "accounts" ("user_id") WHERE "is_default";--> statement-breakpoint
INSERT INTO "accounts" ("user_id", "name", "type", "is_default")
SELECT "id", 'Conta principal', 'checking', true FROM "users"
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "account_id" uuid;--> statement-breakpoint
UPDATE "transactions" t SET "account_id" = a."id"
FROM "accounts" a
WHERE a."user_id" = t."user_id" AND a."is_default" AND t."account_id" IS NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_account_id_idx" ON "transactions" ("account_id");
