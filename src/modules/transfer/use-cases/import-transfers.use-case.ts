import { BadRequestError } from '@core/errors';
import type { Account } from '@infra/db/schema';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { transferRepository } from '../repositories/transfer.repository';

const DAY_MS = 24 * 60 * 60 * 1000;
// PIX/TED entre bancos cai no mesmo dia ou no seguinte.
const MATCH_WINDOW_MS = DAY_MS;

interface StatementRow {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
}

export interface TransferMatch {
  transactionId: string;
  accountId: string;
}

/**
 * Linhas do extrato de uma conta corrente que têm a outra ponta já lançada noutra conta corrente:
 * tipo oposto, mesmo valor, até um dia de diferença. Cada transação casa com uma linha só.
 */
export const findTransferMatches = async (
  userId: string,
  account: Account | null,
  rows: StatementRow[]
): Promise<Map<string, TransferMatch>> => {
  const matches = new Map<string, TransferMatch>();
  if (!account || account.type !== 'checking' || rows.length === 0) return matches;

  const times = rows.map((row) => row.date.getTime());
  const candidates = await transactionRepository.findTransferCandidates(
    userId,
    account.id,
    new Date(Math.min(...times) - MATCH_WINDOW_MS),
    new Date(Math.max(...times) + MATCH_WINDOW_MS)
  );
  const used = new Set<string>();

  for (const row of rows) {
    const candidate = candidates.find(
      (transaction) =>
        !used.has(transaction.id) &&
        transaction.type !== row.type &&
        transaction.amount === row.amount &&
        Math.abs(transaction.date.getTime() - row.date.getTime()) <= MATCH_WINDOW_MS
    );
    if (!candidate) continue;
    used.add(candidate.id);
    matches.set(row.externalId, { transactionId: candidate.id, accountId: candidate.accountId });
  }
  return matches;
};

/**
 * Junta a linha importada e a transação da outra conta numa transferência: a transação some
 * (deixa de contar como receita/despesa) e os dois external ids ficam na transferência.
 */
export const convertToTransfer = async (
  userId: string,
  account: Account,
  row: StatementRow & { transferOf: string }
) => {
  const other = await transactionRepository.findTransferCandidateById(row.transferOf, userId);
  const isPair =
    other &&
    other.accountType === 'checking' &&
    other.accountId !== account.id &&
    other.type !== row.type &&
    other.amount === row.amount;
  if (account.type !== 'checking' || !isPair) {
    throw new BadRequestError('A transação indicada não é a outra ponta desta transferência');
  }

  const incoming = row.type === 'income';
  const transfer = await transferRepository.create({
    userId,
    fromAccountId: incoming ? other.accountId : account.id,
    toAccountId: incoming ? account.id : other.accountId,
    amount: row.amount,
    // A data da saída é quando o dinheiro deixou de estar disponível.
    date: incoming ? other.date : row.date,
    description: null,
    fromExternalId: incoming ? other.externalId : row.externalId,
    toExternalId: incoming ? row.externalId : other.externalId,
  });
  await transactionRepository.delete(other.id, userId);
  return transfer;
};
