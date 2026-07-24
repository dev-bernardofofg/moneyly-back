import { logger } from '@core/lib/logger';
import { notificationRepository } from '../repositories/notification.repository';
import { userRepository } from '@modules/user';
import { getBudgetProgressUseCase } from '@modules/budget';
import { financialPeriodService } from '@modules/financial-period';

type BudgetStatus = 'safe' | 'attention' | 'warning' | 'exceeded';

const STATUS_MAP: Record<
  Exclude<BudgetStatus, 'safe'>,
  { severity: 'info' | 'warning' | 'danger'; label: string }
> = {
  attention: { severity: 'info', label: 'atingiu 75%' },
  warning: { severity: 'warning', label: 'atingiu 90%' },
  exceeded: { severity: 'danger', label: 'foi excedido' },
};

export const processUserBudgetAlerts = async (userId: string): Promise<void> => {
  const period = await financialPeriodService.ensureCurrentPeriodExists(userId);
  const budgets = await getBudgetProgressUseCase(userId);

  for (const budget of budgets) {
    const status = budget.status as BudgetStatus;
    if (status === 'safe') continue;

    const map = STATUS_MAP[status];
    const dedupeKey = `budget:${budget.id}:${period.id}:${status}`;

    const existing = await notificationRepository.findByDedupeKey(dedupeKey);
    if (existing) continue;

    try {
      await notificationRepository.create({
        userId,
        type: 'budget_alert',
        severity: map.severity,
        title: `Orçamento de ${budget.category.name}`,
        message: `O orçamento de ${budget.category.name} ${map.label} (${budget.percentage}%).`,
        relatedId: budget.id,
        periodId: period.id,
        dedupeKey,
        isRead: false,
      });
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === '23505') {
        logger.warn('[notifications] dedupe race skipped', { dedupeKey });
        continue;
      }
      throw error;
    }
  }
};

export const processBudgetAlerts = async (): Promise<void> => {
  const users = await userRepository.findAll();
  for (const user of users) {
    try {
      await processUserBudgetAlerts(user.id);
    } catch (error) {
      logger.error(`[notifications] failed for user ${user.id}`, error as Error);
    }
  }
};
