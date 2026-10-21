import { spMidnight } from '@core/helpers/dates';
import { HttpError } from '@core/errors/http-error';
import { dueDateInPeriod } from '@modules/account/helpers/billing-date';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { cardBillPaymentRepository } from '@modules/account/repositories/card-bill-payment.repository';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { toMoney } from '../helpers/free-balance';

/**
 * Faturas que vencem no período, por cartão e categoria. Compra no cartão já é gravada
 * no período do vencimento, então a soma das despesas do período É a fatura.
 */
export const getCardBillsUseCase = async (userId: string, periodId?: string) => {
  const period = periodId
    ? await financialPeriodService.getPeriodById(periodId, userId)
    : await financialPeriodService.ensureCurrentPeriodExists(userId);
  if (!period) throw new HttpError(404, 'Período não encontrado');

  const cards = (await accountRepository.findActiveByUserId(userId)).filter(
    (account) => account.type === 'credit_card'
  );
  const cardIds = cards.map((card) => card.id);
  const today = spMidnight(new Date());
  const [totals, payments, openPeriods] = await Promise.all([
    transactionRepository.sumExpensesByAccountAndCategory(userId, period.id, cardIds),
    cardBillPaymentRepository.findByAccountIds(userId, cardIds),
    transactionRepository.sumCardExpensesByPeriod(userId, cardIds, today),
  ]);
  const isPaid = (accountId: string, dueDate: Date) =>
    payments.some(
      (row) => row.accountId === accountId && row.dueDate.getTime() === dueDate.getTime()
    );

  // Limite usado = faturas que ainda vão vencer (hoje ou depois) e não estão pagas, incluindo
  // parcelas futuras. Fatura vencida fica de fora: sem marcação, o histórico contaria tudo.
  const limitUsed = (card: (typeof cards)[number]) =>
    openPeriods
      .filter((row) => row.accountId === card.id)
      .reduce((used, row) => {
        const due = dueDateInPeriod(card.dueDay!, row.startDate, row.endDate);
        return due && due.getTime() >= today.getTime() && !isPaid(card.id, due)
          ? used + row.total
          : used;
      }, 0);
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);

  const limitOf = (total: number, used: number) => ({ total, used, available: total - used });

  const bills = cards
    .map((card) => {
      const categories = totals
        .filter((row) => row.accountId === card.id)
        .map((row) => ({
          categoryId: row.categoryId,
          name: row.categoryName,
          amount: toMoney(row.total),
        }))
        .sort((a, b) => b.amount - a.amount);
      const dueDate = dueDateInPeriod(card.dueDay!, start, end);
      const payment = dueDate
        ? payments.find(
            (row) => row.accountId === card.id && row.dueDate.getTime() === dueDate.getTime()
          )
        : undefined;
      return {
        accountId: card.id,
        name: card.name,
        closingDay: card.closingDay!,
        dueDay: card.dueDay!,
        dueDate,
        payment: payment ? { paidAt: payment.paidAt, source: payment.source } : null,
        limit: card.creditLimit ? limitOf(card.creditLimit, limitUsed(card)) : null,
        total: toMoney(categories.reduce((sum, category) => sum + category.amount, 0)),
        categories,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    periodId: period.id,
    total: toMoney(bills.reduce((sum, bill) => sum + bill.total, 0)),
    bills,
  };
};
