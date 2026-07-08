import { logger } from '../lib/logger';
import { notificationRepository } from '../repositories/notification.repository';
import { userRepository } from '../repositories/user.repository';
import type { INotificationRepository } from '../repositories/interfaces/INotificationRepository';
import type { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { PaginationHelper } from '../helpers/pagination';
import { NotFoundError } from './errors';
import { requireUser } from '../validations/user.validation';
import { getBudgetProgressService } from './budget.service';
import { financialPeriodService } from './financial-period.service';

type BudgetStatus = 'safe' | 'attention' | 'warning' | 'exceeded';

const STATUS_MAP: Record<
  Exclude<BudgetStatus, 'safe'>,
  { severity: 'info' | 'warning' | 'danger'; label: string }
> = {
  attention: { severity: 'info', label: 'atingiu 75%' },
  warning: { severity: 'warning', label: 'atingiu 90%' },
  exceeded: { severity: 'danger', label: 'foi excedido' },
};

export interface NotificationServiceDeps {
  notificationRepository: INotificationRepository;
  userRepository: Pick<IUserRepository, 'findAll'>;
  financialPeriodService: Pick<typeof financialPeriodService, 'ensureCurrentPeriodExists'>;
  getBudgetProgress: typeof getBudgetProgressService;
  requireUser: typeof requireUser;
}

export const makeNotificationService = (deps: NotificationServiceDeps) => {
  const {
    notificationRepository,
    userRepository,
    financialPeriodService,
    getBudgetProgress,
    requireUser,
  } = deps;

  /**
   * Gera alertas de orçamento para um usuário (idempotente via dedupeKey).
   * Não rebaixa: cada (budget, período, nível) gera no máximo 1 notificação.
   */
  const processUserBudgetAlerts = async (userId: string): Promise<void> => {
    const period = await financialPeriodService.ensureCurrentPeriodExists(userId);
    const budgets = await getBudgetProgress(userId);

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
        // Apenas corrida do scheduler: unique(dedupeKey) violado (pg 23505).
        // Demais erros precisam propagar.
        const code = (error as { code?: string } | null)?.code;
        if (code === '23505') {
          logger.warn('[notifications] dedupe race skipped', { dedupeKey });
          continue;
        }
        throw error;
      }
    }
  };

  /** Gatilho do scheduler: varre todos os usuários. */
  const processBudgetAlerts = async (): Promise<void> => {
    const users = await userRepository.findAll();
    for (const user of users) {
      try {
        await processUserBudgetAlerts(user.id);
      } catch (error) {
        logger.error(`[notifications] failed for user ${user.id}`, error as Error);
      }
    }
  };

  const list = async (
    userId: string,
    pagination: { page?: number; limit?: number },
    unreadOnly = false
  ) => {
    await requireUser(userId);
    const query = PaginationHelper.validateAndParse(pagination);
    return notificationRepository.findByUserPaginated(userId, query, unreadOnly);
  };

  const markRead = async (id: string, userId: string) => {
    const updated = await notificationRepository.markRead(id, userId);
    if (!updated) throw new NotFoundError('Notificação não encontrada');
    return updated;
  };

  const markAllRead = async (userId: string) => {
    await requireUser(userId);
    const updatedCount = await notificationRepository.markAllRead(userId);
    return { updatedCount };
  };

  return { processUserBudgetAlerts, processBudgetAlerts, list, markRead, markAllRead };
};

// Composition root: instância default com os singletons reais.
export const notificationService = makeNotificationService({
  notificationRepository,
  userRepository,
  financialPeriodService,
  getBudgetProgress: getBudgetProgressService,
  requireUser,
});

// Aliases retrocompatíveis (scheduler em src/server.ts).
export const processBudgetAlerts = notificationService.processBudgetAlerts;
export const processUserBudgetAlerts = notificationService.processUserBudgetAlerts;
