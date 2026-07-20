import { logger } from '@core/lib/logger';
import { notificationRepository } from '../repositories/notification.repository';

interface ReachedMilestone {
  percentage: number;
}

const formatAmount = (amount: string | null): string =>
  Number(amount ?? 0)
    .toFixed(2)
    .replace('.', ',');

/**
 * Gera notificações para milestones recém-atingidos de uma meta (F9).
 * Idempotente via dedupeKey `goal:<goalId>:milestone:<percentage>`.
 */
export const notifyGoalMilestones = async (
  userId: string,
  goal: { id: string; title: string; targetAmount: string; currentAmount: string | null },
  reachedMilestones: ReachedMilestone[]
): Promise<void> => {
  for (const milestone of reachedMilestones) {
    const dedupeKey = `goal:${goal.id}:milestone:${milestone.percentage}`;

    const existing = await notificationRepository.findByDedupeKey(dedupeKey);
    if (existing) continue;

    const completed = milestone.percentage >= 100;

    try {
      await notificationRepository.create({
        userId,
        type: 'goal_milestone',
        severity: 'info',
        title: completed
          ? `Meta concluída: ${goal.title}`
          : `Meta ${goal.title}: ${milestone.percentage}% atingido`,
        message: completed
          ? `Parabéns! Você atingiu os R$ ${formatAmount(goal.targetAmount)} da meta "${goal.title}".`
          : `Você já poupou R$ ${formatAmount(goal.currentAmount)} dos R$ ${formatAmount(goal.targetAmount)} da meta "${goal.title}".`,
        relatedId: goal.id,
        periodId: null,
        dedupeKey,
        isRead: false,
      });
    } catch (error) {
      // Apenas corrida: unique(dedupeKey) violado (pg 23505). Demais erros propagam.
      const code = (error as { code?: string } | null)?.code;
      if (code === '23505') {
        logger.warn('[notifications] goal milestone dedupe race skipped', { dedupeKey });
        continue;
      }
      throw error;
    }
  }
};
