import type { TransactionWithCategory } from "../repositories/transaction.repository";

export type SubscriptionCadence = "weekly" | "monthly" | "yearly";

export interface SubscriptionCandidate {
  title: string;
  categoryId: string;
  categoryName: string;
  averageAmount: number;
  occurrences: number;
  cadence: SubscriptionCadence;
  firstDate: string;
  lastDate: string;
  nextEstimatedDate: string;
  monthlyCost: number;
}

const MIN_OCCURRENCES = 3;
const AMOUNT_TOLERANCE = 0.1; // ±10%

/** Normaliza título: lowercase, sem acento, sem sufixo numérico (ex "Spotify 03/12"). */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\d/\-.]+\s*$/g, "")
    .trim();
}

function classifyCadence(avgDays: number): SubscriptionCadence | null {
  if (avgDays >= 5 && avgDays <= 9) return "weekly";
  if (avgDays >= 25 && avgDays <= 35) return "monthly";
  if (avgDays >= 350 && avgDays <= 380) return "yearly";
  return null;
}

function monthlyFactor(cadence: SubscriptionCadence): number {
  if (cadence === "weekly") return 4.3333;
  if (cadence === "yearly") return 1 / 12;
  return 1;
}

function addCadence(date: Date, cadence: SubscriptionCadence): Date {
  const d = new Date(date);
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

/**
 * Heurística pura: detecta grupos de despesas recorrentes não modeladas
 * como recurring_transactions. Testável sem DB.
 */
export function groupSubscriptionCandidates(
  transactions: TransactionWithCategory[]
): SubscriptionCandidate[] {
  const expenses = transactions.filter(
    (t) => t.type === "expense" && !t.recurringTransactionId
  );

  const groups = new Map<string, TransactionWithCategory[]>();
  for (const tx of expenses) {
    const key = normalizeTitle(tx.title);
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const candidates: SubscriptionCandidate[] = [];

  for (const items of groups.values()) {
    if (items.length < MIN_OCCURRENCES) continue;

    const amounts = items.map((i) => Number(i.amount));
    const avgAmount =
      amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avgAmount <= 0) continue;

    // Consistência de valor: todos dentro de ±tolerância da média
    const amountConsistent = amounts.every(
      (a) => Math.abs(a - avgAmount) <= avgAmount * AMOUNT_TOLERANCE
    );
    if (!amountConsistent) continue;

    const sorted = items
      .map((i) => new Date(i.date))
      .sort((a, b) => a.getTime() - b.getTime());

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(
        (sorted[i]!.getTime() - sorted[i - 1]!.getTime()) / 86400000
      );
    }
    const avgInterval =
      intervals.reduce((s, v) => s + v, 0) / intervals.length;

    const cadence = classifyCadence(avgInterval);
    if (!cadence) continue;

    // Intervalos consistentes (desvio máx 35% da média)
    const intervalConsistent = intervals.every(
      (v) => Math.abs(v - avgInterval) <= avgInterval * 0.35
    );
    if (!intervalConsistent) continue;

    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const sample = items[0]!;

    candidates.push({
      title: sample.title,
      categoryId: sample.category.id,
      categoryName: sample.category.name,
      averageAmount: Number(avgAmount.toFixed(2)),
      occurrences: items.length,
      cadence,
      firstDate: first.toISOString(),
      lastDate: last.toISOString(),
      nextEstimatedDate: addCadence(last, cadence).toISOString(),
      monthlyCost: Number((avgAmount * monthlyFactor(cadence)).toFixed(2)),
    });
  }

  return candidates.sort((a, b) => b.monthlyCost - a.monthlyCost);
}
