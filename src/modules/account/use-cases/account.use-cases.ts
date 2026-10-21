import { spDayString } from '@core/helpers/dates';
import { BadRequestError } from '@core/errors';
import { financialPeriodService } from '@modules/financial-period';
import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { transferLegs } from '@modules/transfer/helpers/transfer-legs';
import { transferRepository } from '@modules/transfer/repositories/transfer.repository';
import type { Account } from '@infra/db/schema';
import { billingDateFor } from '../helpers/billing-date';
import { accountRepository } from '../repositories/account.repository';
import type { CreateAccountInput, UpdateAccountInput } from '../schemas/account.schema';
import {
  validateActiveAccount,
  validateUniqueAccountName,
} from '../validations/account.validation';

export const listAccountsUseCase = async (userId: string) => {
  await accountRepository.ensureDefault(userId);
  const accounts = await accountRepository.findActiveByUserId(userId);

  const cutoffs = accounts.flatMap((account) =>
    account.type === 'checking' && account.openingBalanceDate ? [account.openingBalanceDate] : []
  );
  const legs =
    cutoffs.length > 0
      ? (
          await transferRepository.findSince(
            userId,
            new Date(Math.min(...cutoffs.map((date) => date.getTime())))
          )
        ).flatMap(transferLegs)
      : [];

  // Saldo atual só com saldo inicial: sem ele não há de onde partir.
  return Promise.all(
    accounts.map(async (account) => {
      const since = account.type === 'checking' ? account.openingBalanceDate : null;
      if (!since) return { ...account, currentBalance: null };
      const transactionsNet = await transactionRepository.sumSignedSince(userId, account.id, since);
      const transfersNet = legs
        .filter((leg) => leg.accountId === account.id && leg.date.getTime() >= since.getTime())
        .reduce((total, leg) => total + (leg.type === 'income' ? leg.amount : -leg.amount), 0);
      return {
        ...account,
        currentBalance: account.openingBalance + transactionsNet + transfersNet,
      };
    })
  );
};

export const createAccountUseCase = async (userId: string, data: CreateAccountInput) => {
  await validateUniqueAccountName(userId, data.name);
  return accountRepository.create({
    userId,
    name: data.name,
    type: data.type,
    closingDay: data.type === 'credit_card' ? data.closingDay : null,
    dueDay: data.type === 'credit_card' ? data.dueDay : null,
    creditLimit: data.type === 'credit_card' ? (data.creditLimit ?? null) : null,
    ...(data.type === 'checking' && data.openingBalanceDate
      ? {
          openingBalance: data.openingBalance ?? 0,
          openingBalanceDate: data.openingBalanceDate,
        }
      : {}),
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
  if (account.type === 'checking' && data.creditLimit !== undefined) {
    throw new BadRequestError('Conta corrente não tem limite');
  }
  if (
    account.type === 'credit_card' &&
    (data.openingBalance !== undefined || data.openingBalanceDate !== undefined)
  ) {
    throw new BadRequestError('Cartão não tem saldo inicial');
  }
  if (
    data.openingBalance !== undefined &&
    !data.openingBalanceDate &&
    !account.openingBalanceDate
  ) {
    throw new BadRequestError('Informe a data do saldo');
  }
  if (data.name !== undefined) await validateUniqueAccountName(userId, data.name, id);

  const { openingBalance, openingBalanceDate, ...rest } = data;
  const updated = (await accountRepository.update(id, userId, {
    ...rest,
    ...(openingBalance !== undefined && { openingBalance }),
    ...(openingBalanceDate !== undefined && {
      openingBalanceDate,
      ...(openingBalanceDate === null && { openingBalance: 0 }),
    }),
  }))!;
  const billingChanged =
    (data.closingDay !== undefined && data.closingDay !== account.closingDay) ||
    (data.dueDay !== undefined && data.dueDay !== account.dueDay);
  if (billingChanged) await reassignBillingPeriods(userId, updated);
  return updated;
};

// Fechamento/vencimento mudou: cada compra pode cair em outra fatura e outro período.
const reassignBillingPeriods = async (userId: string, account: Account) => {
  const rows = await transactionRepository.findDatesByAccountId(userId, account.id);
  const idsByBillingDay = new Map<string, { date: Date; ids: string[] }>();
  for (const { id, date } of rows) {
    const billingDate = billingDateFor(account, date);
    const day = spDayString(billingDate);
    const group = idsByBillingDay.get(day) ?? { date: billingDate, ids: [] };
    group.ids.push(id);
    idsByBillingDay.set(day, group);
  }
  for (const { date, ids } of idsByBillingDay.values()) {
    const periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, date);
    await transactionRepository.setPeriodId(userId, ids, periodId);
  }
};

export const deleteAccountUseCase = async (id: string, userId: string) => {
  const account = await validateActiveAccount(id, userId);
  if (account.isDefault) throw new BadRequestError('A conta padrão não pode ser removida');
  // Soft delete: transações antigas continuam apontando para a conta. Recorrências
  // seguem cobrando na conta padrão; senão cada execução falharia com conta inativa.
  await recurringTransactionRepository.moveToDefaultAccount(userId, id);
  return (await accountRepository.update(id, userId, { isActive: false }))!;
};

/** Conta informada (validada) ou a padrão do usuário. Usado por todo caminho que cria transação. */
export const resolveAccount = async (userId: string, accountId?: string | null) => {
  if (accountId) return validateActiveAccount(accountId, userId);
  return accountRepository.ensureDefault(userId);
};

export const resolveAccountId = async (userId: string, accountId?: string | null) =>
  (await resolveAccount(userId, accountId)).id;
