const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ForecastConfidence = 'low' | 'medium' | 'high';

type GoalForReserve = {
  targetDate: Date;
  progress: { remaining: number };
};

type BudgetForReserve = {
  remaining: number;
  category: { id: string };
};

type FutureExpense = {
  amount: number;
  categoryId: string;
};

const roundMoney = (value: number) => Math.round(value);

export const calculateDaysRemaining = (asOf: Date, endDate: Date): number =>
  Math.max(0, Math.ceil((endDate.getTime() - asOf.getTime()) / DAY_IN_MS));

export const calculateGoalReserve = (
  goals: GoalForReserve[],
  periodStart: Date,
  periodEnd: Date,
  asOf: Date
): number => {
  const periodDays = Math.max(
    1,
    Math.ceil((periodEnd.getTime() - periodStart.getTime()) / DAY_IN_MS) + 1
  );

  return roundMoney(
    goals.reduce((total, goal) => {
      if (goal.progress.remaining <= 0) return total;

      const daysToTarget = Math.ceil(
        (new Date(goal.targetDate).getTime() - asOf.getTime()) / DAY_IN_MS
      );
      const periodsToTarget = Math.max(1, Math.ceil(daysToTarget / periodDays));

      return total + goal.progress.remaining / periodsToTarget;
    }, 0)
  );
};

export const calculateBudgetReserve = (
  budgets: BudgetForReserve[],
  futureExpenses: FutureExpense[]
): number => {
  const committedByCategory = futureExpenses.reduce<Record<string, number>>(
    (totals, expense) => ({
      ...totals,
      [expense.categoryId]: (totals[expense.categoryId] ?? 0) + expense.amount,
    }),
    {}
  );

  return roundMoney(
    budgets.reduce(
      (total, budget) =>
        total + Math.max(0, budget.remaining - (committedByCategory[budget.category.id] ?? 0)),
      0
    )
  );
};

export const getForecastConfidence = (
  expectedFixedIncome: number,
  realizedIncome: number,
  hasBudgets: boolean
): ForecastConfidence => {
  if (expectedFixedIncome > 0 && hasBudgets) return 'high';
  if (expectedFixedIncome > 0 || realizedIncome > 0) return 'medium';
  return 'low';
};

export const toMoney = roundMoney;
