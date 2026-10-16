import { ConflictError, NotFoundError } from '@core/errors';
import type { Account } from '@infra/db/schema';
import { accountRepository } from '../repositories/account.repository';

export async function validateActiveAccount(id: string, userId: string): Promise<Account> {
  const account = await accountRepository.findByIdAndUserId(id, userId);
  if (!account || !account.isActive) throw new NotFoundError('Conta não encontrada');
  return account;
}

export async function validateUniqueAccountName(userId: string, name: string, exceptId?: string) {
  const existing = await accountRepository.findActiveByName(userId, name);
  if (existing && existing.id !== exceptId) {
    throw new ConflictError('Já existe uma conta com esse nome');
  }
}
