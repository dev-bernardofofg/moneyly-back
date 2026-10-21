ALTER TABLE "recurring_transactions" ADD COLUMN IF NOT EXISTS "account_id" uuid REFERENCES "accounts"("id");
