import { format } from 'date-fns';
import { sumAmounts } from '../helpers/amount';
import { getCurrentFinancialPeriod } from '../helpers/financial-period';
import type { PaginationQuery } from '../helpers/pagination';
import { toSaoPauloTimezone } from '../helpers/dates';
import { transactionRepository } from '../repositories/transaction.repository';
import type { TransactionWithCategory } from '../repositories/transaction.repository';
import { userRepository } from '../repositories/user.repository';
import type { ITransactionRepository } from '../repositories/interfaces/ITransactionRepository';
import type { IUserRepository } from '../repositories/interfaces/IUserRepository';
import type {
  ITransaction,
  TransactionFilters,
  UpdateTransactionData,
} from '../types/transaction.types';
import { financialPeriodService } from './financial-period.service';
import { validateCategoryExistsForUser } from '../validations/transaction.validation';
import { NotFoundError } from './errors';

export interface TransactionServiceDeps {
  transactionRepository: ITransactionRepository;
  userRepository: Pick<IUserRepository, 'findById'>;
  financialPeriodService: Pick<typeof financialPeriodService, 'findOrCreatePeriodForDate'>;
  validateCategory: typeof validateCategoryExistsForUser;
}

const computeSpendingStats = (totalExpense: number, monthlyIncome: number, alertMsg: string) => {
  const percentUsed =
    monthlyIncome > 0 ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2)) : null;
  const alert = percentUsed !== null && percentUsed >= 80 ? alertMsg : null;
  return { percentUsed, alert };
};

const aggregateByType = (txns: TransactionWithCategory[]) => {
  let realIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of txns) {
    if (tx.type === 'income') realIncome += Number(tx.amount);
    if (tx.type === 'expense') totalExpense += Number(tx.amount);
    byCategory[tx.category.id] = (byCategory[tx.category.id] || 0) + Number(tx.amount);
  }

  return { realIncome, totalExpense, byCategory };
};

export const makeTransactionService = (deps: TransactionServiceDeps) => {
  const { transactionRepository, userRepository, financialPeriodService, validateCategory } = deps;

  const create = async (userId: string, transaction: ITransaction) => {
    await validateCategory(transaction.category, userId);

    const transactionDate = transaction.date
      ? toSaoPauloTimezone(transaction.date)
      : toSaoPauloTimezone(new Date());

    const periodId = await financialPeriodService.findOrCreatePeriodForDate(
      userId,
      transactionDate
    );

    return transactionRepository.create({
      userId,
      type: transaction.type,
      title: transaction.title,
      amount: transaction.amount,
      categoryId: transaction.category,
      description: transaction.description,
      date: transactionDate,
      periodId,
      recurringTransactionId: transaction.recurringTransactionId ?? null,
    });
  };

  const update = async (id: string, userId: string, updateData: UpdateTransactionData) => {
    if (updateData.categoryId) {
      await validateCategory(updateData.categoryId, userId);
    }

    if (updateData.date) {
      updateData.date = toSaoPauloTimezone(updateData.date);
      updateData.periodId = await financialPeriodService.findOrCreatePeriodForDate(
        userId,
        updateData.date
      );
    }

    const transaction = await transactionRepository.update(id, userId, updateData);

    if (!transaction) throw new NotFoundError('Transação não encontrada');

    return transaction;
  };

  const getPaginated = async (
    userId: string,
    pagination: PaginationQuery,
    filters: TransactionFilters
  ) => {
    return transactionRepository.findByUserIdPaginated(userId, pagination, filters);
  };

  const remove = async (id: string, userId: string) => {
    const deleted = await transactionRepository.delete(id, userId);
    if (!deleted) throw new NotFoundError('Transação não encontrada');
    return deleted;
  };

  const getList = async (userId: string, filters: TransactionFilters) => {
    const [txns, user] = await Promise.all([
      transactionRepository.findByUserId(userId, filters),
      userRepository.findById(userId),
    ]);

    const monthlyIncome = Number(user?.monthlyIncome) || 0;
    const totalExpense = sumAmounts(txns.filter((tx) => tx.type === 'expense'));
    const totalIncome = sumAmounts(txns.filter((tx) => tx.type === 'income'));
    const { percentUsed, alert } = computeSpendingStats(
      totalExpense,
      monthlyIncome,
      'Você já usou mais de 80% do seu rendimento mensal neste filtro!'
    );

    return { transactions: txns, totalExpense, totalIncome, monthlyIncome, percentUsed, alert };
  };

  const getSummary = async (userId: string) => {
    const [allTxns, user] = await Promise.all([
      transactionRepository.findAllByUserId(userId),
      userRepository.findById(userId),
    ]);

    const { realIncome, totalExpense, byCategory } = aggregateByType(allTxns);

    const monthlyIncome = Number(user?.monthlyIncome) || 0;
    const balance = monthlyIncome - totalExpense;
    const { percentUsed, alert } = computeSpendingStats(
      totalExpense,
      monthlyIncome,
      'Você já usou mais de 80% do seu rendimento mensal!'
    );

    return {
      totalIncome: realIncome,
      totalExpenses: totalExpense,
      monthlyIncome,
      balance,
      percentUsed,
      byCategory,
      alert,
    };
  };

  const getMonthly = async (userId: string, filters: { startDate?: Date; endDate?: Date }) => {
    const [txns, user] = await Promise.all([
      transactionRepository.findByUserId(userId, filters),
      userRepository.findById(userId),
    ]);

    const monthlyIncome = Number(user?.monthlyIncome) || 0;
    const summary: Record<
      string,
      { income: number; expense: number; percentUsed: number | null; alert: string | null }
    > = {};

    for (const tx of txns) {
      const monthKey = format(new Date(tx.date), 'yyyy-MM');
      if (!summary[monthKey]) {
        summary[monthKey] = { income: 0, expense: 0, percentUsed: null, alert: null };
      }
      if (tx.type === 'income') summary[monthKey]!.income += Number(tx.amount);
      else summary[monthKey]!.expense += Number(tx.amount);
    }

    for (const monthData of Object.values(summary)) {
      const stats = computeSpendingStats(
        monthData.expense,
        monthlyIncome,
        'Você já usou mais de 80% do seu rendimento mensal!'
      );
      monthData.percentUsed = stats.percentUsed;
      monthData.alert = stats.alert;
    }

    return Object.entries(summary).map(([month, data]) => ({ month, ...data }));
  };

  const getCurrentPeriod = async (userId: string) => {
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

    const { realIncome, totalExpense, byCategory } = aggregateByType(txns);

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

  return {
    create,
    update,
    getPaginated,
    delete: remove,
    getList,
    getSummary,
    getMonthly,
    getCurrentPeriod,
  };
};

// Composition root: instância default com os singletons reais.
export const transactionService = makeTransactionService({
  transactionRepository,
  userRepository,
  financialPeriodService,
  validateCategory: validateCategoryExistsForUser,
});
