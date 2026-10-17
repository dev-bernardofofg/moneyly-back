import { HttpError } from '@core/errors/http-error';
import { accountRepository } from '@modules/account/repositories/account.repository';
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
  const totals = await transactionRepository.sumExpensesByAccountAndCategory(
    userId,
    period.id,
    cards.map((card) => card.id)
  );

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
      return {
        accountId: card.id,
        name: card.name,
        closingDay: card.closingDay!,
        dueDay: card.dueDay!,
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
