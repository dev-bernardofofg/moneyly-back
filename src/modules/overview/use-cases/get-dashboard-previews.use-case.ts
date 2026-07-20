import { formatPeriodLabel, getPreviousFinancialPeriods } from '@modules/financial-period';
import { groupSubscriptionCandidates } from '@modules/subscription';
import { transactionRepository } from '@modules/transaction';
import { buildComparison } from '../helpers/comparative-insights';

export interface DashboardPreviews {
  subscriptions: {
    count: number;
    topMonthlyCost: number | null;
    topTitle: string | null;
  };
  comparison: {
    signal: 'up' | 'down' | 'stable';
    deltaPct: number | null;
    topHighlight: string | null;
  };
}

/**
 * Prévia compacta de F3/F4 p/ o dashboard (F5). 1 só findAllByUserId,
 * reaproveitado pelas duas heurísticas. Sem listas completas.
 */
export const getDashboardPreviewsUseCase = async (
  userId: string,
  financialDayStart: number,
  financialDayEnd: number
): Promise<DashboardPreviews> => {
  const transactions = await transactionRepository.findAllByUserId(userId);

  const subs = groupSubscriptionCandidates(transactions);
  const topSub = subs[0] ?? null;

  const periods = getPreviousFinancialPeriods(financialDayStart, financialDayEnd, 4).map((p) => ({
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabel(p.startDate, p.endDate),
  }));
  const cmp = buildComparison(transactions, periods);

  return {
    subscriptions: {
      count: subs.length,
      topMonthlyCost: topSub ? topSub.monthlyCost : null,
      topTitle: topSub ? topSub.title : null,
    },
    comparison: {
      signal: cmp.totals.signal,
      deltaPct: cmp.totals.deltaPct,
      topHighlight: cmp.highlights[0] ?? null,
    },
  };
};
