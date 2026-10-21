-- Reverte 0012: centavos (integer) voltam para reais (numeric). Rodar à mão; o migrator não lê esta pasta.
-- Depois, apagar a linha 0012 de drizzle.__drizzle_migrations e voltar o código para antes da migração.
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT * FROM (VALUES
      ('users', 'monthly_income', 10, '0'),
      ('transactions', 'amount', 10, NULL),
      ('accounts', 'opening_balance', 12, '0'),
      ('budgets', 'monthly_limit', 10, NULL),
      ('goals', 'target_amount', 10, NULL),
      ('goals', 'current_amount', 10, '0'),
      ('goal_milestones', 'amount', 10, NULL),
      ('recurring_transactions', 'amount', 10, NULL),
      ('companies', 'hourly_rate', 10, NULL),
      ('overtime_records', 'hourly_rate_snapshot', 10, NULL),
      ('overtime_records', 'amount', 10, NULL)
    ) AS t(table_name, column_name, precision, default_value)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = col.table_name
        AND c.column_name = col.column_name
        AND c.data_type = 'integer'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', col.table_name, col.column_name);
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE numeric(%s, 2) USING (%I / 100.0)',
        col.table_name, col.column_name, col.precision, col.column_name
      );
      IF col.default_value IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT %L',
          col.table_name, col.column_name, col.default_value
        );
      END IF;
    END IF;
  END LOOP;
END $$;
