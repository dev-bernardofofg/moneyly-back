import { BadRequestError, NotFoundError } from '@core/errors';
import { parseTransactionDate } from '@core/helpers/dates';
import { HttpError } from '@core/errors/http-error';
import type { Account } from '@infra/db/schema';
import { validateActiveAccount } from '@modules/account/validations/account.validation';
import { financialPeriodService } from '@modules/financial-period';
import { transferRepository } from '../repositories/transfer.repository';
import type { CreateTransferInput } from '../schemas/transfer.schema';

// Só entre contas correntes: pagar fatura não é transferência (as compras já contaram).
export const validateTransferAccount = async (accountId: string, userId: string) => {
  const account: Account = await validateActiveAccount(accountId, userId);
  if (account.type !== 'checking') {
    throw new BadRequestError('Transferência é só entre contas correntes');
  }
  return account;
};

export const createTransferUseCase = async (userId: string, data: CreateTransferInput) => {
  await Promise.all([
    validateTransferAccount(data.fromAccountId, userId),
    validateTransferAccount(data.toAccountId, userId),
  ]);
  const date = parseTransactionDate(data.date);
  if (date.getTime() > Date.now()) throw new BadRequestError('A data não pode ser no futuro.');
  return transferRepository.create({
    userId,
    fromAccountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    amount: data.amount,
    date,
    description: data.description ?? null,
  });
};

export const listTransfersUseCase = async (userId: string, periodId?: string) => {
  const period = periodId
    ? await financialPeriodService.getPeriodById(periodId, userId)
    : await financialPeriodService.ensureCurrentPeriodExists(userId);
  if (!period) throw new HttpError(404, 'Período não encontrado');
  return transferRepository.findInRange(
    userId,
    new Date(period.startDate),
    new Date(period.endDate)
  );
};

export const deleteTransferUseCase = async (id: string, userId: string) => {
  const removed = await transferRepository.delete(id, userId);
  if (!removed) throw new NotFoundError('Transferência não encontrada');
};
