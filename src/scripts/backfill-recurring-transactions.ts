import { calculateNextExecution } from '../helpers/dates';
import { recurringTransactionRepository } from '../repositories/recurring-transaction.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { createTransactionService } from '../services/transaction.service';
import type { RecurringFrequency } from '../types/recurring-transaction.types';

function generateExecutionDates(
  frequency: string,
  startDate: Date,
  totalInstallments: number,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date[] {
  const dates: Date[] = [startDate];
  let prev = startDate;
  for (let i = 1; i < totalInstallments; i++) {
    const next = calculateNextExecution(
      frequency as RecurringFrequency,
      dayOfMonth,
      dayOfWeek,
      prev
    );
    dates.push(next);
    prev = next;
  }
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function run() {
  const all = await recurringTransactionRepository.findAllActive();
  const finite = all.filter((r) => r.totalInstallments !== null);

  console.log(`Found ${finite.length} active recurring transactions with installments`);

  let ok = 0;
  let fail = 0;

  for (const r of finite) {
    try {
      const existing = await transactionRepository.findByRecurringTransactionId(r.id, r.userId);
      const totalInstallments = r.totalInstallments!;

      const allDates = generateExecutionDates(
        r.frequency,
        new Date(r.startDate ?? r.nextExecution),
        totalInstallments,
        r.dayOfMonth,
        r.dayOfWeek
      );

      const missingDates = allDates.filter(
        (date) => !existing.some((tx) => isSameDay(new Date(tx.date), date))
      );

      console.log(
        `[${r.id}] total=${totalInstallments} existing=${existing.length} missing=${missingDates.length}`
      );

      if (missingDates.length > 0) {
        await Promise.all(
          missingDates.map((date) =>
            createTransactionService(r.userId, {
              type: r.type as 'income' | 'expense',
              title: r.title,
              amount: r.amount,
              category: r.categoryId,
              description: r.description ?? '',
              date,
              recurringTransactionId: r.id,
            })
          )
        );
      }

      await recurringTransactionRepository.update(r.id, r.userId, {
        executedInstallments: totalInstallments,
        isActive: false,
      });

      console.log(`[OK] ${r.id} → ${missingDates.length} transactions created, deactivated`);
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
