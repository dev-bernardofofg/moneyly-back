import { spMidnight } from '@core/helpers/dates';
import { NotFoundError } from '@core/errors';
import type { Account } from '@infra/db/schema';
import { nearestDueDate } from '@modules/account/helpers/billing-date';
import { cardBillPaymentRepository } from '@modules/account/repositories/card-bill-payment.repository';
import { validateActiveCard } from '@modules/account/validations/account.validation';

// Data informada vira o vencimento real do cartão: o front não precisa acertar o dia exato.
const resolveDueDate = (card: Account, date: string) =>
  nearestDueDate(card.dueDay!, spMidnight(date));

export const markBillPaidUseCase = async (userId: string, accountId: string, dueDate: string) => {
  const card = await validateActiveCard(accountId, userId);
  return cardBillPaymentRepository.markManual({
    userId,
    accountId,
    dueDate: resolveDueDate(card, dueDate),
  });
};

export const unmarkBillPaidUseCase = async (userId: string, accountId: string, dueDate: string) => {
  const card = await validateActiveCard(accountId, userId);
  const removed = await cardBillPaymentRepository.remove({
    userId,
    accountId,
    dueDate: resolveDueDate(card, dueDate),
  });
  if (!removed) throw new NotFoundError('Fatura não estava marcada como paga');
};
