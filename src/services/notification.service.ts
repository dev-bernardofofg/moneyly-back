import { logger } from "../lib/logger";
import { notificationRepository } from "../repositories/notification.repository";
import { userRepository } from "../repositories/user.repository";
import { PaginationHelper } from "../helpers/pagination";
import { HttpError } from "../validations/errors";
import { requireUser } from "../validations/user.validation";
import { getBudgetProgressService } from "./budget.service";
import { financialPeriodService } from "./financial-period.service";

type BudgetStatus = "safe" | "attention" | "warning" | "exceeded";

const STATUS_MAP: Record<
  Exclude<BudgetStatus, "safe">,
  { severity: "info" | "warning" | "danger"; label: string }
> = {
  attention: { severity: "info", label: "atingiu 75%" },
  warning: { severity: "warning", label: "atingiu 90%" },
  exceeded: { severity: "danger", label: "foi excedido" },
};

/**
 * Gera alertas de orçamento para um usuário (idempotente via dedupeKey).
 * Não rebaixa: cada (budget, período, nível) gera no máximo 1 notificação.
 */
export const processUserBudgetAlerts = async (
  userId: string
): Promise<void> => {
  const period = await financialPeriodService.ensureCurrentPeriodExists(userId);
  const budgets = await getBudgetProgressService(userId);

  for (const budget of budgets) {
    const status = budget.status as BudgetStatus;
    if (status === "safe") continue;

    const map = STATUS_MAP[status];
    const dedupeKey = `budget:${budget.id}:${period.id}:${status}`;

    const existing = await notificationRepository.findByDedupeKey(dedupeKey);
    if (existing) continue;

    try {
      await notificationRepository.create({
        userId,
        type: "budget_alert",
        severity: map.severity,
        title: `Orçamento de ${budget.category.name}`,
        message: `O orçamento de ${budget.category.name} ${map.label} (${budget.percentage}%).`,
        relatedId: budget.id,
        periodId: period.id,
        dedupeKey,
        isRead: false,
      });
    } catch (error) {
      // Corrida do scheduler: unique(dedupeKey) violado → já existe, ignora.
      logger.warn("[notifications] dedupe race skipped", { dedupeKey });
    }
  }
};

/** Gatilho do scheduler: varre todos os usuários. */
export const processBudgetAlerts = async (): Promise<void> => {
  const users = await userRepository.findAll();
  for (const user of users) {
    try {
      await processUserBudgetAlerts(user.id);
    } catch (error) {
      logger.error(
        `[notifications] failed for user ${user.id}`,
        error as Error
      );
    }
  }
};

export const listNotificationsService = async (
  userId: string,
  pagination: { page?: number; limit?: number },
  unreadOnly = false
) => {
  await requireUser(userId);
  const query = PaginationHelper.validateAndParse(pagination);
  return notificationRepository.findByUserPaginated(userId, query, unreadOnly);
};

export const markNotificationReadService = async (
  id: string,
  userId: string
) => {
  const updated = await notificationRepository.markRead(id, userId);
  if (!updated) throw new HttpError(404, "Notificação não encontrada");
  return updated;
};

export const markAllNotificationsReadService = async (userId: string) => {
  await requireUser(userId);
  const updatedCount = await notificationRepository.markAllRead(userId);
  return { updatedCount };
};
