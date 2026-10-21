import { formatCents } from '@core/helpers/amount';
import { dispatchNotification } from './dispatch-notification.use-case';

interface ReachedMilestone {
  percentage: number;
}

/**
 * Gera notificações para milestones recém-atingidos de uma meta (F9).
 * Idempotente via dedupeKey `goal:<goalId>:milestone:<percentage>`.
 */
export const notifyGoalMilestones = async (
  userId: string,
  goal: { id: string; title: string; targetAmount: number; currentAmount: number | null },
  reachedMilestones: ReachedMilestone[]
): Promise<void> => {
  for (const milestone of reachedMilestones) {
    const dedupeKey = `goal:${goal.id}:milestone:${milestone.percentage}`;
    const completed = milestone.percentage >= 100;

    await dispatchNotification({
      userId,
      type: 'goal_milestone',
      severity: 'info',
      title: completed
        ? `Meta concluída: ${goal.title}`
        : `Meta ${goal.title}: ${milestone.percentage}% atingido`,
      message: completed
        ? `Parabéns! Você atingiu os R$ ${formatCents(goal.targetAmount)} da meta "${goal.title}".`
        : `Você já poupou R$ ${formatCents(goal.currentAmount)} dos R$ ${formatCents(goal.targetAmount)} da meta "${goal.title}".`,
      relatedId: goal.id,
      periodId: null,
      dedupeKey,
      isRead: false,
    });
  }
};
