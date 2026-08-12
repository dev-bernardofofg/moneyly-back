import { sumAmounts } from '@core/helpers/amount';
import { logger } from '@core/lib/logger';
import { getBudgetStatus } from '@modules/budget';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { userRepository } from '@modules/user';
import { dispatchNotification } from './dispatch-notification.use-case';

type SpendingStatus = 'safe' | 'attention' | 'warning' | 'exceeded';

const STATUS_MAP: Record<
  Exclude<SpendingStatus, 'safe'>,
  { severity: 'info' | 'warning' | 'danger'; label: string }
> = {
  attention: { severity: 'info', label: 'atingiu 75%' },
  warning: { severity: 'warning', label: 'atingiu 90%' },
  exceeded: { severity: 'danger', label: 'ultrapassou 100%' },
};

/**
 * Alerta de gasto do período (saídas ÷ monthlyIncome), independente de categoria.
 * Idempotente via dedupeKey `spending:<userId>:<periodId>:<status>`.
 */
export const processUserSpendingAlert = async (userId: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user) return;

  const monthlyIncome = Number(user.monthlyIncome) || 0;
  if (monthlyIncome <= 0) return;

  const period = await financialPeriodService.ensureCurrentPeriodExists(userId);
  const transactions = await transactionRepository.findByPeriodId(userId, period.id);
  const totalExpense = sumAmounts(transactions.filter((tx) => tx.type === 'expense'));

  const percentage = Math.round((totalExpense / monthlyIncome) * 10000) / 100;
  const status = getBudgetStatus(percentage) as SpendingStatus;
  if (status === 'safe') return;

  const map = STATUS_MAP[status];
  const dedupeKey = `spending:${userId}:${period.id}:${status}`;

  await dispatchNotification({
    userId,
    type: 'spending_alert',
    severity: map.severity,
    title: 'Gasto do período',
    message: `Você já usou ${percentage}% da sua renda mensal neste período (${map.label}).`,
    relatedId: null,
    periodId: period.id,
    dedupeKey,
    isRead: false,
  });
};

export const processSpendingAlerts = async (): Promise<void> => {
  const users = await userRepository.findAll();
  for (const user of users) {
    try {
      await processUserSpendingAlert(user.id);
    } catch (error) {
      logger.error(`[notifications] spending alert failed for user ${user.id}`, error as Error);
    }
  }
};
