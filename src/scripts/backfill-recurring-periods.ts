import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import { financialPeriodService } from '../services/financial-period.service';
import type { RecurringFrequency } from '../types/recurring-transaction.types';

function calcMonthsNeeded(frequency: string, totalInstallments?: number | null): number {
  if (!totalInstallments) return 3;
  switch (frequency as RecurringFrequency) {
    case 'daily':
      return Math.ceil(totalInstallments / 30);
    case 'weekly':
      return Math.ceil(totalInstallments / 4);
    case 'monthly':
      return totalInstallments;
    case 'yearly':
      return totalInstallments * 12;
    default:
      return 3;
  }
}

async function run() {
  const all = await recurringTransactionRepository.findAllActive();
  console.log(`Found ${all.length} active recurring transactions`);

  let ok = 0;
  let fail = 0;

  for (const r of all) {
    try {
      const months = calcMonthsNeeded(r.frequency, r.totalInstallments);
      await financialPeriodService.createNextPeriods(r.userId, months);
      console.log(
        `[OK] ${r.id} (${r.frequency}, ${r.totalInstallments ?? '∞'} installments) → ${months} months`
      );
      ok++;
    } catch (err) {
      console.error(`[FAIL] ${r.id}`, err);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  process.exit(0);
}

run();
