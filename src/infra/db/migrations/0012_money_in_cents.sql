-- Dinheiro passa de reais (numeric) para centavos (integer).
-- Só converte coluna ainda numeric: rodar de novo não multiplica por 100 outra vez.
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT * FROM (VALUES
      ('users', 'monthly_income', '0'),
      ('transactions', 'amount', NULL),
      ('accounts', 'opening_balance', '0'),
      ('budgets', 'monthly_limit', NULL),
      ('goals', 'target_amount', NULL),
      ('goals', 'current_amount', '0'),
      ('goal_milestones', 'amount', NULL),
      ('recurring_transactions', 'amount', NULL),
      ('companies', 'hourly_rate', NULL),
      ('overtime_records', 'hourly_rate_snapshot', NULL),
      ('overtime_records', 'amount', NULL)
    ) AS t(table_name, column_name, default_value)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = col.table_name
        AND c.column_name = col.column_name
        AND c.data_type = 'numeric'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', col.table_name, col.column_name);
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE integer USING round(%I * 100)::integer',
        col.table_name, col.column_name, col.column_name
      );
      IF col.default_value IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT %s',
          col.table_name, col.column_name, col.default_value
        );
      END IF;
    END IF;
  END LOOP;
END $$;
