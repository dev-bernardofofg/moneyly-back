import type { PeriodCategoryTotal } from '@modules/transaction/repositories/ITransactionRepository';
import { deltaOf, signalOf } from './comparative-insights';

export interface InsightPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  label: string;
}

interface BuildPeriodInsightsInput {
  /** Do mais antigo ao mais novo; o selecionado é o último. */
  periods: InsightPeriod[];
  selectedId: string;
  totals: PeriodCategoryTotal[];
  /** Contas recorrentes ainda previstas no período selecionado. */
  upcomingExpense: number;
  isOpen: boolean;
}

/**
 * Tudo por período financeiro (periodId), não por data: compra no cartão conta no período da
 * fatura, igual no Saldo Livre. A média usa só os períodos anteriores com movimento, para o
 * começo do histórico (sem lançamentos) não puxar a média para baixo.
 */
export function buildPeriodInsights({
  periods,
  selectedId,
  totals,
  upcomingExpense,
  isOpen,
}: BuildPeriodInsightsInput) {
  const flows = new Map<string, { income: number; expense: number }>();
  for (const row of totals) {
    const entry = flows.get(row.periodId) ?? { income: 0, expense: 0 };
    entry[row.type] += row.total;
    flows.set(row.periodId, entry);
  }
  const flowOf = (id: string) => flows.get(id) ?? { income: 0, expense: 0 };

  const selected = periods.find((period) => period.id === selectedId)!;
  const own = flowOf(selectedId);
  const upcoming = isOpen ? upcomingExpense : 0;
  const projectedExpense = own.expense + upcoming;

  const previous = periods.filter((period) => {
    const flow = flowOf(period.id);
    return period.id !== selectedId && flow.income + flow.expense > 0;
  });
  const previousIds = new Set(previous.map((period) => period.id));
  const averageOf = (total: number) =>
    previous.length ? Math.round(total / previous.length) : null;

  const averageExpense = averageOf(
    previous.reduce((total, period) => total + flowOf(period.id).expense, 0)
  );
  const deltaPct = averageExpense ? deltaOf(projectedExpense, averageExpense) : null;

  const byCategory = new Map<string, { name: string; amount: number; previousTotal: number }>();
  for (const row of totals) {
    if (row.type !== 'expense') continue;
    const isSelected = row.periodId === selectedId;
    if (!isSelected && !previousIds.has(row.periodId)) continue;
    const entry = byCategory.get(row.categoryId) ?? {
      name: row.categoryName,
      amount: 0,
      previousTotal: 0,
    };
    if (isSelected) entry.amount += row.total;
    else entry.previousTotal += row.total;
    byCategory.set(row.categoryId, entry);
  }

  const categories = [...byCategory.entries()]
    .filter(([, entry]) => entry.amount > 0)
    .map(([categoryId, entry]) => {
      const averageAmount = averageOf(entry.previousTotal);
      const categoryDelta = averageAmount ? deltaOf(entry.amount, averageAmount) : null;
      return {
        categoryId,
        name: entry.name,
        amount: entry.amount,
        share: own.expense > 0 ? Number(((entry.amount / own.expense) * 100).toFixed(1)) : 0,
        averageAmount,
        deltaPct: categoryDelta,
        signal: signalOf(categoryDelta),
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    period: { ...selected, isOpen },
    spending: {
      income: own.income,
      expense: own.expense,
      upcomingExpense: upcoming,
      projectedExpense,
      averageExpense,
      deltaPct,
      signal: signalOf(deltaPct),
      periodsCompared: previous.length,
    },
    history: periods.map((period) => {
      const flow = flowOf(period.id);
      const isSelected = period.id === selectedId;
      return {
        periodId: period.id,
        label: period.label,
        startDate: period.startDate,
        endDate: period.endDate,
        income: flow.income,
        expense: flow.expense,
        projectedExpense: isSelected ? projectedExpense : flow.expense,
        isSelected,
      };
    }),
    categories,
  };
}
