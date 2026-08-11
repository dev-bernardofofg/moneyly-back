/**
 * Interface pública do módulo notification.
 * Outros módulos e o server importam APENAS daqui (ver .specs/06).
 */
export { NotificationRouter } from './notification.router';
export {
  processBudgetAlerts,
  processUserBudgetAlerts,
} from './use-cases/process-budget-alerts.use-case';
export { processBillReminders } from './use-cases/process-bill-reminders.use-case';
export { notifyGoalMilestones } from './use-cases/notify-goal-milestones.use-case';
export { dispatchNotification } from './use-cases/dispatch-notification.use-case';
export { sendPushToUser } from './services/push.service';
