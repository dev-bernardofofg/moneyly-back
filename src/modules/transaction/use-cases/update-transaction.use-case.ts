import { parseTransactionDate } from '@core/helpers/dates';
import { HttpError } from '@core/errors/http-error';
import { billingDateFor } from '@modules/account/helpers/billing-date';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { resolveAccount } from '@modules/account/use-cases/account.use-cases';
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

  // Data e conta definem juntas o período (cartão usa o vencimento da fatura): mudar
  // qualquer uma recalcula com o valor atual da outra.
  if (updateData.date || updateData.accountId) {
    const existing = await transactionRepository.findByIdAndUserId(id, userId);
    if (!existing) throw new HttpError(404, 'Transação não encontrada');

    // Conta atual pode estar desativada: editar só a data não pode falhar por isso.
    const account = updateData.accountId
      ? await resolveAccount(userId, updateData.accountId)
      : await accountRepository.findByIdAndUserId(existing.accountId, userId);
    if (!account) throw new HttpError(404, 'Conta não encontrada');
    // Contrato: dia-semântica → instante canônico (meia-noite SP).
    const date = updateData.date ? parseTransactionDate(updateData.date) : existing.date;

    updateData.accountId = account.id;
    updateData.date = date;
    updateData.periodId = await financialPeriodService.findOrCreatePeriodForDate(
      userId,
      billingDateFor(account, date)
    );
  }

  const transaction = await transactionRepository.update(id, userId, updateData);

  if (!transaction) throw new HttpError(404, 'Transação não encontrada');

  return transaction;
};
