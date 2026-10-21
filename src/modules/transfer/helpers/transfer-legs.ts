import type { Transfer } from '@infra/db/schema';

export interface TransferLeg {
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
}

/** Saída na origem e entrada no destino: entram no saldo de cada conta, nunca em receita/despesa. */
export const transferLegs = (transfer: Transfer): TransferLeg[] => [
  {
    accountId: transfer.fromAccountId,
    type: 'expense',
    amount: transfer.amount,
    date: transfer.date,
  },
  { accountId: transfer.toAccountId, type: 'income', amount: transfer.amount, date: transfer.date },
];
