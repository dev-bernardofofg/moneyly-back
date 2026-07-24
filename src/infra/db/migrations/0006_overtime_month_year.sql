ALTER TABLE "overtime_records" ADD COLUMN "month" integer;--> statement-breakpoint
ALTER TABLE "overtime_records" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "overtime_records" DROP COLUMN IF EXISTS "period_id";--> statement-breakpoint
UPDATE "overtime_records" SET "month" = 0, "year" = 0 WHERE "month" IS NULL OR "year" IS NULL;--> statement-breakpoint
ALTER TABLE "overtime_records" ALTER COLUMN "month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "overtime_records" ALTER COLUMN "year" SET NOT NULL;
