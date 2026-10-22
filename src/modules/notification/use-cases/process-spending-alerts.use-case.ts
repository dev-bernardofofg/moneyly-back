import { sumAmounts } from '@core/helpers/amount';
import { logger } from '@core/lib/logger';
import { getBudgetStatus } from '@modules/budget';
import { expectedIncomeForPeriod } from '@modules/overview/helpers/expected-income';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { userRepository } from '@modules/user';
import { notificationRepository } from '../repositories/notification.repository';
import { dispatchNotification } from './dispatch-notification.use-case';

type SpendingStatus = 'safe' | 'attention' | 'warning' | 'exceeded';

const ALERT_STATUSES = ['attention', 'warning', 'exceeded'] as const;

const STATUS_MAP: Record<
  Exclude<SpendingStatus, 'safe'>,
  { severity: 'info' | 'warning' | 'danger'; label: string }
> = {
  attention: { severity: 'info', label: 'atingiu 75%' },
  warning: { severity: 'warning', label: 'atingiu 90%' },
  exceeded: { severity: 'danger', label: 'ultrapassou 100%' },
};

/** Statuses estritamente acima do atual — devem ser removidos se o gasto cair. */
const statusesAbove = (status: SpendingStatus): (typeof ALERT_STATUSES)[number][] => {
  const rank = status === 'safe' ? -1 : ALERT_STATUSES.indexOf(status);
  return ALERT_STATUSES.filter((_, index) => index > rank);
};

const spendingDedupeKey = (userId: string, periodId: string, status: string) =>
  `spending:${userId}:${periodId}:${status}`;

/**
 * Sincroniza alertas de gasto do período:
 * - remove statuses que não valem mais (ex.: delete de despesa)
 * - cria o alerta do status atual se ≥75%
 */
export const processUserSpendingAlert = async (
  userId: string,
  periodId?: string
): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user) return;

  const expected = await expectedIncomeForPeriod(userId, periodId);
  const period = { id: expected.periodId };
  const monthlyIncome = expected.income;
  if (monthlyIncome <= 0) return;

  const transactions = await transactionRepository.findByPeriodId(userId, period.id);
  const totalExpense = sumAmounts(transactions.filter((tx) => tx.type === 'expense'));

  const percentage = Math.round((totalExpense / monthlyIncome) * 10000) / 100;
  const status = getBudgetStatus(percentage) as SpendingStatus;

  const staleKeys = statusesAbove(status).map((s) => spendingDedupeKey(userId, period.id, s));
  if (staleKeys.length > 0) {
    await notificationRepository.deleteByDedupeKeys(staleKeys);
  }

  if (status === 'safe') return;

  const map = STATUS_MAP[status];
  await dispatchNotification({
    userId,
    type: 'spending_alert',
    severity: map.severity,
    title: 'Gasto do período',
    message: `Você já usou ${percentage}% da renda deste período (${map.label}).`,
    relatedId: null,
    periodId: period.id,
    dedupeKey: spendingDedupeKey(userId, period.id, status),
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
