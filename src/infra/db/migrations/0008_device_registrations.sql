CREATE TABLE IF NOT EXISTS "device_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fid" text NOT NULL,
	"user_agent" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_registrations_fid_unique" UNIQUE("fid")
);
--> statement-breakpoint
ALTER TABLE "device_registrations" ADD CONSTRAINT "device_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_registrations_user_id_idx" ON "device_registrations" ("user_id");
