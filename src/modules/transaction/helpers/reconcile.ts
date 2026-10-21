const DAY_MS = 24 * 60 * 60 * 1000;
// Lançamento no app e na fatura/extrato raramente batem no dia: compensação, fuso, agendamento.
const DATE_WINDOW_MS = 3 * DAY_MS;
// Recorrência é estimativa (assinatura em dólar varia): aceita até 10% de diferença.
const RECURRING_TOLERANCE = 0.1;

export interface ReconcileRow {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
}

export interface ReconcileCandidate {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  externalId: string | null;
  recurringTransactionId: string | null;
}

export type ReconcileMatch =
  // Já veio de outro arquivo (ex.: OFX do cartão antes do PDF da fatura).
  | { kind: 'imported'; transactionId: string }
  // Lançado no app (manual ou recorrência): confirmar liga a linha a ele em vez de duplicar.
  | { kind: 'existing'; transactionId: string };

/**
 * Casa linhas importadas com transações que já existem na conta. `samePeriod` (fatura em PDF):
 * a fatura define o período, então a data não precisa bater (parcela antiga, recorrência).
 * Cada transação casa com uma linha só; valor exato vence a tolerância, depois a data mais perto.
 */
export function reconcile(
  rows: ReconcileRow[],
  candidates: ReconcileCandidate[],
  { samePeriod = false }: { samePeriod?: boolean } = {}
): Map<string, ReconcileMatch> {
  const matches = new Map<string, ReconcileMatch>();
  const used = new Set<string>();

  const score = (row: ReconcileRow, candidate: ReconcileCandidate) => {
    if (used.has(candidate.id) || candidate.type !== row.type) return null;
    const dateGap = Math.abs(candidate.date.getTime() - row.date.getTime());
    if (!samePeriod && dateGap > DATE_WINDOW_MS) return null;
    const amountGap = Math.abs(candidate.amount - row.amount);
    const tolerance = candidate.recurringTransactionId ? row.amount * RECURRING_TOLERANCE : 0;
    if (amountGap > tolerance) return null;
    return amountGap * DAY_MS * 100 + dateGap;
  };

  // Valor exato primeiro: evita que uma estimativa de recorrência roube a linha certa.
  const ordered = [...rows].sort(
    (a, b) =>
      Number(candidates.some((c) => c.amount === b.amount)) -
      Number(candidates.some((c) => c.amount === a.amount))
  );
  for (const row of ordered) {
    let best: { candidate: ReconcileCandidate; score: number } | null = null;
    for (const candidate of candidates) {
      const value = score(row, candidate);
      if (value !== null && (!best || value < best.score)) best = { candidate, score: value };
    }
    if (!best) continue;
    used.add(best.candidate.id);
    matches.set(row.externalId, {
      kind: best.candidate.externalId ? 'imported' : 'existing',
      transactionId: best.candidate.id,
    });
  }
  return matches;
}
