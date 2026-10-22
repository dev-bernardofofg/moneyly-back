-- Renda vem das transações (entradas + recorrentes previstas); o valor fixo do perfil saiu.
-- Destrutivo: os valores antigos se perdem. Rodar só com o back que não lê a coluna já no ar.
ALTER TABLE "users" DROP COLUMN IF EXISTS "monthly_income";
