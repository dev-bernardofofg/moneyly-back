import { buildPeriodInsights } from '@modules/overview/helpers/period-insights';
import type { PeriodCategoryTotal } from '@modules/transaction/repositories/ITransactionRepository';

const period = (id: string, month: number) => ({
  id,
  startDate: new Date(Date.UTC(2026, month, 5, 3)),
  endDate: new Date(Date.UTC(2026, month + 1, 5, 2, 59, 59)),
  label: id,
});

const row = (
  periodId: string,
  type: 'income' | 'expense',
  categoryId: string,
  total: number
): PeriodCategoryTotal => ({ periodId, type, categoryId, categoryName: categoryId, total });

// p0 sem movimento (antes do usuário começar), p1 e p2 com histórico, p3 selecionado.
const periods = [period('p0', 5), period('p1', 6), period('p2', 7), period('p3', 8)];
const totals = [
  row('p1', 'income', 'salario', 500000),
  row('p1', 'expense', 'mercado', 80000),
  row('p1', 'expense', 'lazer', 20000),
  row('p2', 'income', 'salario', 500000),
  row('p2', 'expense', 'mercado', 120000),
  row('p2', 'expense', 'lazer', 20000),
  row('p3', 'income', 'salario', 500000),
  row('p3', 'expense', 'mercado', 150000),
  row('p3', 'expense', 'farmacia', 10000),
];

describe('buildPeriodInsights', () => {
  it('averages only previous periods that had movement', () => {
    const r = buildPeriodInsights({
      periods,
      selectedId: 'p3',
      totals,
      upcomingExpense: 0,
      isOpen: false,
    });

    expect(r.spending).toMatchObject({
      income: 500000,
      expense: 160000,
      projectedExpense: 160000,
      averageExpense: 120000, // (100000 + 140000) / 2, p0 fica de fora
      deltaPct: 33.3,
      signal: 'up',
      periodsCompared: 2,
    });
  });

  it('adds the upcoming bills to the projection only while the period is open', () => {
    const open = buildPeriodInsights({
      periods,
      selectedId: 'p3',
      totals,
      upcomingExpense: 30000,
      isOpen: true,
    });
    const closed = buildPeriodInsights({
      periods,
      selectedId: 'p3',
      totals,
      upcomingExpense: 30000,
      isOpen: false,
    });

    expect(open.spending).toMatchObject({ upcomingExpense: 30000, projectedExpense: 190000 });
    expect(open.history.at(-1)).toMatchObject({ expense: 160000, projectedExpense: 190000 });
    expect(closed.spending).toMatchObject({ upcomingExpense: 0, projectedExpense: 160000 });
  });

  it('lists where the money went, biggest first, against each category average', () => {
    const r = buildPeriodInsights({
      periods,
      selectedId: 'p3',
      totals,
      upcomingExpense: 0,
      isOpen: false,
    });

    expect(r.categories).toEqual([
      {
        categoryId: 'mercado',
        name: 'mercado',
        amount: 150000,
        share: 93.8,
        averageAmount: 100000,
        deltaPct: 50,
        signal: 'up',
      },
      {
        categoryId: 'farmacia',
        name: 'farmacia',
        amount: 10000,
        share: 6.3,
        averageAmount: 0,
        deltaPct: null,
        signal: 'stable',
      },
    ]);
  });

  it('has no comparison without previous history', () => {
    const r = buildPeriodInsights({
      periods: [period('p3', 8)],
      selectedId: 'p3',
      totals: totals.filter((total) => total.periodId === 'p3'),
      upcomingExpense: 0,
      isOpen: false,
    });

    expect(r.spending).toMatchObject({ averageExpense: null, deltaPct: null, periodsCompared: 0 });
    expect(r.categories[0]).toMatchObject({ averageAmount: null, deltaPct: null });
    expect(r.history).toHaveLength(1);
  });
});
