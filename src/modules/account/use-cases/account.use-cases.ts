import { BadRequestError } from '@core/errors';
import { accountRepository } from '../repositories/account.repository';
import type { CreateAccountInput, UpdateAccountInput } from '../schemas/account.schema';
import {
  validateActiveAccount,
  validateUniqueAccountName,
} from '../validations/account.validation';

export const listAccountsUseCase = async (userId: string) => {
  await accountRepository.ensureDefault(userId);
  return accountRepository.findActiveByUserId(userId);
};

export const createAccountUseCase = async (userId: string, data: CreateAccountInput) => {
  await validateUniqueAccountName(userId, data.name);
  return accountRepository.create({
    userId,
    name: data.name,
    type: data.type,
    closingDay: data.type === 'credit_card' ? data.closingDay : null,
    dueDay: data.type === 'credit_card' ? data.dueDay : null,
    isDefault: false,
    isActive: true,
  });
};

export const updateAccountUseCase = async (
  id: string,
  userId: string,
  data: UpdateAccountInput
) => {
  const account = await validateActiveAccount(id, userId);
  if (account.type === 'checking' && (data.closingDay !== undefined || data.dueDay !== undefined)) {
    throw new BadRequestError('Conta corrente não tem fechamento nem vencimento');
  }
  if (data.name !== undefined) await validateUniqueAccountName(userId, data.name, id);

  return (await accountRepository.update(id, userId, data))!;
};

export const deleteAccountUseCase = async (id: string, userId: string) => {
  const account = await validateActiveAccount(id, userId);
  if (account.isDefault) throw new BadRequestError('A conta padrão não pode ser removida');
  // Soft delete: transações antigas continuam apontando para a conta.
  return (await accountRepository.update(id, userId, { isActive: false }))!;
};

/** Conta informada (validada) ou a padrão do usuário. Usado por todo caminho que cria transação. */
export const resolveAccountId = async (userId: string, accountId?: string | null) => {
  if (accountId) return (await validateActiveAccount(accountId, userId)).id;
  return (await accountRepository.ensureDefault(userId)).id;
};
