import { accountRepository } from '../repositories/account.repository';
import { validateActiveAccount } from '../validations/account.validation';

/** Conta informada (validada) ou a padrão do usuário. Usado por todo caminho que cria transação. */
export const resolveAccount = async (userId: string, accountId?: string | null) => {
  if (accountId) return validateActiveAccount(accountId, userId);
  return accountRepository.ensureDefault(userId);
};

export const resolveAccountId = async (userId: string, accountId?: string | null) =>
  (await resolveAccount(userId, accountId)).id;
