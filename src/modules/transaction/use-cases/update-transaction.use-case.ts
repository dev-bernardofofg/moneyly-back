import { parseTransactionDate } from '@core/helpers/dates';
import { HttpError } from '@core/errors/http-error';
import { resolveAccountId } from '@modules/account/use-cases/account.use-cases';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '../repositories/transaction.repository';
import { validateCategoryExistsForUser } from '../validations/transaction.validation';

export const updateTransactionUseCase = async (
  id: string,
  userId: string,
  updateData: Partial<{
    type: 'income' | 'expense';
    title: string;
    amount: string;
    categoryId: string;
    description: string | null;
    date: Date;
    periodId: string;
    accountId: string;
  }>
) => {
  if (updateData.categoryId) {
    await validateCategoryExistsForUser(updateData.categoryId, userId);
  }

  if (updateData.accountId) {
    updateData.accountId = await resolveAccountId(userId, updateData.accountId);
  }

  if (updateData.date) {
    // Contrato: dia-semântica → instante canônico (meia-noite SP).
    updateData.date = parseTransactionDate(updateData.date);
    updateData.periodId = await financialPeriodService.findOrCreatePeriodForDate(
      userId,
      updateData.date
    );
  }

  const transaction = await transactionRepository.update(id, userId, updateData);

  if (!transaction) throw new HttpError(404, 'Transação não encontrada');

  return transaction;
};
