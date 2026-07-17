import { format } from 'date-fns';
import { NotFoundError } from '../../../core/errors';
import { getCurrentFinancialPeriod } from '../../financial-period';
import { userRepository } from '../../user';
import { computeSpendingStats } from '../helpers/spending-stats';
import { transactionRepository } from '../repositories/transaction.repository';

export const getCurrentPeriodSummaryUseCase = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError('Usuário não encontrado');

  const financialDayStart = user.financialDayStart ?? 1;
  const financialDayEnd = user.financialDayEnd ?? 31;
  const monthlyIncome = Number(user.monthlyIncome) || 0;
  const currentPeriod = getCurrentFinancialPeriod(financialDayStart, financialDayEnd);

  const txns = await transactionRepository.findByUserId(userId, {
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
  });

  let realIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of txns) {
    if (tx.type === 'income') realIncome += Number(tx.amount);
    if (tx.type === 'expense') totalExpense += Number(tx.amount);
    byCategory[tx.category.id] = (byCategory[tx.category.id] || 0) + Number(tx.amount);
  }

  const balance = monthlyIncome - totalExpense;
  const { percentUsed, alert } = computeSpendingStats(
    totalExpense,
    monthlyIncome,
    'Você já usou mais de 80% do seu rendimento mensal no período atual!'
  );

  return {
    currentPeriod: {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
      description: `Período financeiro: ${format(currentPeriod.startDate, 'dd/MM/yyyy')} a ${format(currentPeriod.endDate, 'dd/MM/yyyy')}`,
    },
    totalIncome: realIncome,
    totalExpenses: totalExpense,
    monthlyIncome,
    balance,
    percentUsed,
    byCategory,
    alert,
    transactionsCount: txns.length,
  };
};
