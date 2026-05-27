-- Dedup financial_periods: para cada (user_id, start_date, end_date),
-- mantém o registro mais antigo e repointa FKs dos demais antes de deletar.
CREATE TEMPORARY TABLE _fp_dedup AS
SELECT
  fp.id AS loser_id,
  (
    SELECT fp2.id
    FROM "financial_periods" fp2
    WHERE fp2."user_id" = fp."user_id"
      AND fp2."start_date" = fp."start_date"
      AND fp2."end_date" = fp."end_date"
    ORDER BY fp2."created_at" ASC, fp2."id" ASC
    LIMIT 1
  ) AS winner_id
FROM "financial_periods" fp;
--> statement-breakpoint
UPDATE "transactions" t
SET "period_id" = m.winner_id
FROM _fp_dedup m
WHERE t."period_id" = m.loser_id
  AND m.loser_id <> m.winner_id;
--> statement-breakpoint
UPDATE "notifications" n
SET "period_id" = m.winner_id
FROM _fp_dedup m
WHERE n."period_id" = m.loser_id
  AND m.loser_id <> m.winner_id;
--> statement-breakpoint
DELETE FROM "financial_periods" fp
USING _fp_dedup m
WHERE fp."id" = m.loser_id
  AND m.loser_id <> m.winner_id;
--> statement-breakpoint
DROP TABLE _fp_dedup;
--> statement-breakpoint
ALTER TABLE "financial_periods"
ADD CONSTRAINT "financial_periods_user_start_end_unique"
UNIQUE ("user_id", "start_date", "end_date");
