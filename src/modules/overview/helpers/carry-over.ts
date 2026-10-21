interface BalanceAccount {
  id: string;
  type: 'checking' | 'credit_card';
  openingBalance: string | number;
  openingBalanceDate: Date | null;
}

interface Flow {
  accountId: string;
  type: 'income' | 'expense';
  amount: string | number;
  date: Date;
}

/**
 * Saldos iniciais das contas correntes vigentes até o fim do período. Cada saldo tem um corte:
 * o que aconteceu antes dele já está no saldo. Cartões e contas sem saldo usam o corte mais
 * antigo, porque compras pagas antes dele saíram do dinheiro já informado.
 * Período anterior a todos os saldos (ou nenhum saldo informado): nada muda, tudo conta.
 */
export function buildOpeningBalances(accounts: BalanceAccount[], periodEnd: Date) {
  const active = accounts.filter(
    (account) =>
      account.type === 'checking' &&
      account.openingBalanceDate &&
      account.openingBalanceDate.getTime() <= periodEnd.getTime()
  );
  const cutoffById = new Map(active.map((a) => [a.id, a.openingBalanceDate!.getTime()]));
  const globalCutoff = active.length
    ? Math.min(...active.map((a) => a.openingBalanceDate!.getTime()))
    : null;

  const counts = (flow: Pick<Flow, 'accountId' | 'date'>) => {
    const cutoff = cutoffById.get(flow.accountId) ?? globalCutoff;
    return cutoff === null || new Date(flow.date).getTime() >= cutoff;
  };

  const opening = active.reduce((total, a) => total + Number(a.openingBalance), 0);

  /** Saldo trazido para o período: saldos iniciais + fluxos de períodos anteriores após o corte. */
  const carryOver = (previousFlows: Flow[]) =>
    opening +
    previousFlows
      .filter(counts)
      .reduce((total, f) => total + (f.type === 'income' ? 1 : -1) * Number(f.amount), 0);

  return {
    since: globalCutoff === null ? null : new Date(globalCutoff),
    counts,
    carryOver,
  };
}
