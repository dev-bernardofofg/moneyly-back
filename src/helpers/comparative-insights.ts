import type { TransactionWithCategory } from '../repositories/transaction.repository';

export type CompareSignal = 'up' | 'down' | 'stable';

export interface ComparativePeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface CategoryComparison {
  categoryId: string;
  categoryName: string;
  currentExpense: number;
  averageExpense: number;
  deltaPct: number | null;
  signal: CompareSignal;
  message: string;
}

export interface ComparativeInsights {
  basis: {
    periodsCompared: number;
    currentPeriod: { startDate: string; endDate: string; label: string };
  };
  totals: {
    currentExpense: number;
    averageExpense: number;
    deltaPct: number | null;
    signal: CompareSignal;
  };
  byCategory: CategoryComparison[];
  highlights: string[];
}

const STABLE_THRESHOLD = 10; // |deltaPct| < 10% = stable
const MIN_AVG_FOR_HIGHLIGHT = 1;

function signalOf(deltaPct: number | null): CompareSignal {
  if (deltaPct === null) return 'stable';
  if (Math.abs(deltaPct) < STABLE_THRESHOLD) return 'stable';
  return deltaPct > 0 ? 'up' : 'down';
}

function deltaOf(current: number, average: number): number | null {
  if (average === 0) return null;
  return Number((((current - average) / average) * 100).toFixed(1));
}

function inPeriod(d: Date, p: ComparativePeriod): boolean {
  return d.getTime() >= p.startDate.getTime() && d.getTime() <= p.endDate.getTime();
}

function messageFor(name: string, current: number, deltaPct: number | null): string {
  if (deltaPct === null) {
    return current > 0 ? `Novo gasto em ${name}` : `Sem gasto em ${name}`;
  }
  if (Math.abs(deltaPct) < STABLE_THRESHOLD) {
    return `${name} estável vs sua média`;
  }
  const dir = deltaPct > 0 ? 'acima da' : 'abaixo da';
  return `${name} ${Math.abs(deltaPct)}% ${dir} sua média`;
}

/**
 * Núcleo puro: compara período atual (periods[0]) vs média dos demais.
 * Testável sem DB. `periods` ordenado do mais recente (atual) ao mais antigo.
 */
export function buildComparison(
  transactions: TransactionWithCategory[],
  periods: ComparativePeriod[]
): ComparativeInsights {
  const current = periods[0];
  const previous = periods.slice(1);

  const emptyBasisLabel = current?.label ?? '';
  const basis = {
    periodsCompared: previous.length,
    currentPeriod: {
      startDate: current ? current.startDate.toISOString() : '',
      endDate: current ? current.endDate.toISOString() : '',
      label: emptyBasisLabel,
    },
  };

  if (!current) {
    return {
      basis,
      totals: {
        currentExpense: 0,
        averageExpense: 0,
        deltaPct: null,
        signal: 'stable',
      },
      byCategory: [],
      highlights: [],
    };
  }

  const expenses = transactions.filter((t) => t.type === 'expense');

  // categoria → { current, somaPrev }
  const map = new Map<string, { name: string; current: number; prevSum: number }>();
  let totalCurrent = 0;
  let totalPrevSum = 0;

  for (const tx of expenses) {
    const d = new Date(tx.date);
    const amount = Number(tx.amount);
    const cat = tx.category;
    const entry = map.get(cat.id) ?? { name: cat.name, current: 0, prevSum: 0 };

    if (inPeriod(d, current)) {
      entry.current += amount;
      totalCurrent += amount;
    } else if (previous.some((p) => inPeriod(d, p))) {
      entry.prevSum += amount;
      totalPrevSum += amount;
    }
    map.set(cat.id, entry);
  }

  const divisor = previous.length || 1;

  const byCategory: CategoryComparison[] = [];
  for (const [categoryId, v] of map.entries()) {
    const averageExpense = Number((v.prevSum / divisor).toFixed(2));
    const currentExpense = Number(v.current.toFixed(2));
    if (currentExpense === 0 && averageExpense === 0) continue;
    const deltaPct = deltaOf(currentExpense, averageExpense);
    byCategory.push({
      categoryId,
      categoryName: v.name,
      currentExpense,
      averageExpense,
      deltaPct,
      signal: signalOf(deltaPct),
      message: messageFor(v.name, currentExpense, deltaPct),
    });
  }

  byCategory.sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0));

  const averageExpense = Number((totalPrevSum / divisor).toFixed(2));
  const currentExpense = Number(totalCurrent.toFixed(2));
  const totalsDelta = deltaOf(currentExpense, averageExpense);

  const highlights = byCategory
    .filter(
      (c) =>
        c.deltaPct !== null &&
        Math.abs(c.deltaPct) >= STABLE_THRESHOLD &&
        c.averageExpense >= MIN_AVG_FOR_HIGHLIGHT
    )
    .slice(0, 3)
    .map((c) => c.message);

  return {
    basis,
    totals: {
      currentExpense,
      averageExpense,
      deltaPct: totalsDelta,
      signal: signalOf(totalsDelta),
    },
    byCategory,
    highlights,
  };
}
