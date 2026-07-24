import { parseTransactionDate } from '@core/helpers/dates';
import { HttpError } from '@core/errors/http-error';
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
    description: string;
    date: Date;
    periodId: string;
  }>
) => {
  if (updateData.categoryId) {
    await validateCategoryExistsForUser(updateData.categoryId, userId);
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
