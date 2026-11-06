import { spMidnightOf } from '@core/helpers/dates';
import {
  findSalary,
  occurrencesBetween,
  overtimeMonthForSalary,
  type SalaryCandidate,
} from '@modules/recurring-transaction/helpers/occurrences';

const sp = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return spMidnightOf(y, m - 1, d);
};

const base = {
  type: 'income',
  isActive: true,
  dayOfWeek: null,
  startDate: null,
  totalInstallments: null,
  executedInstallments: 0,
} as const;

const salary5000: SalaryCandidate = {
  ...base,
  id: 'salary',
  amount: 500000,
  frequency: 'monthly',
  dayOfMonth: 5,
  nextExecution: sp('2026-12-05'),
};
const freelance500: SalaryCandidate = {
  ...base,
  id: 'freelance',
  amount: 50000,
  frequency: 'monthly',
  dayOfMonth: 20,
  nextExecution: sp('2026-11-20'),
};
const weeklyIncome: SalaryCandidate = {
  ...base,
  id: 'weekly',
  amount: 900000,
  frequency: 'weekly',
  dayOfMonth: null,
  dayOfWeek: 1,
  nextExecution: sp('2026-11-09'),
};

describe('findSalary', () => {
  const now = sp('2026-11-05');

  it('picks the largest active monthly income', () => {
    const found = findSalary([freelance500, salary5000], now);
    expect(found?.recurrence.id).toBe('salary');
    expect(found?.date).toEqual(sp('2026-12-05'));
  });

  it('ignores non-monthly, inactive and expense recurrences', () => {
    expect(findSalary([weeklyIncome], now)).toBeNull();
    expect(findSalary([{ ...salary5000, isActive: false }], now)).toBeNull();
    expect(findSalary([{ ...salary5000, type: 'expense' }], now)).toBeNull();
  });

  it('returns the first occurrence after now when nextExecution is not after now', () => {
    const overdue = { ...salary5000, nextExecution: sp('2026-11-05') };
    expect(findSalary([overdue], now)?.date).toEqual(sp('2026-12-05'));
  });

  it('returns the first real date of a salary that starts in the future', () => {
    const future = {
      ...salary5000,
      startDate: sp('2027-01-05'),
      nextExecution: sp('2027-01-05'),
    };
    expect(findSalary([future], now)?.date).toEqual(sp('2027-01-05'));
  });
});

describe('overtimeMonthForSalary', () => {
  it('maps hours of month M to the salary of month M+1', () => {
    expect(overtimeMonthForSalary(sp('2026-12-03'))).toEqual({ month: 11, year: 2026 });
    expect(overtimeMonthForSalary(sp('2027-01-03'))).toEqual({ month: 12, year: 2026 });
  });
});

describe('occurrencesBetween', () => {
  const monthlyDay31 = {
    frequency: 'monthly',
    dayOfMonth: 31,
    dayOfWeek: null,
    nextExecution: sp('2027-02-28'),
    startDate: null,
    totalInstallments: null,
    executedInstallments: 0,
  } as const;

  it('clamps day 31 to the end of the month, with exclusive bounds', () => {
    expect(occurrencesBetween(monthlyDay31, sp('2027-01-31'), sp('2027-03-01'))).toEqual([
      sp('2027-02-28'),
    ]);
  });

  it('reproduces dates already advanced by the cron', () => {
    const advanced = {
      ...monthlyDay31,
      dayOfMonth: 10,
      startDate: sp('2026-01-10'),
      nextExecution: sp('2027-03-10'),
    };
    expect(occurrencesBetween(advanced, sp('2027-01-05'), sp('2027-03-11'))).toEqual([
      sp('2027-01-10'),
      sp('2027-02-10'),
      sp('2027-03-10'),
    ]);
  });

  it('only consumes remaining installments from nextExecution onward', () => {
    const twoInstallmentsLeft = {
      ...monthlyDay31,
      dayOfMonth: 10,
      startDate: sp('2026-01-10'),
      nextExecution: sp('2027-03-10'),
      totalInstallments: 5,
      executedInstallments: 3,
    };
    expect(
      occurrencesBetween(twoInstallmentsLeft, sp('2026-12-01'), sp('2035-01-01'))
    ).toHaveLength(2 + 3);
    expect(occurrencesBetween(twoInstallmentsLeft, sp('2027-03-09'), sp('2035-01-01'))).toEqual([
      sp('2027-03-10'),
      sp('2027-04-10'),
    ]);
  });

  it('invents nothing before a future start', () => {
    const future = {
      ...monthlyDay31,
      dayOfMonth: 20,
      startDate: sp('2027-01-20'),
      nextExecution: sp('2027-01-20'),
    };
    expect(occurrencesBetween(future, sp('2026-11-05'), sp('2027-03-01'))).toEqual([
      sp('2027-01-20'),
      sp('2027-02-20'),
    ]);
  });

  it('stops stepping back at startDate', () => {
    const advanced = {
      ...monthlyDay31,
      dayOfMonth: 10,
      startDate: sp('2027-01-10'),
      nextExecution: sp('2027-03-10'),
    };
    expect(occurrencesBetween(advanced, sp('2026-11-01'), sp('2027-03-11'))).toEqual([
      sp('2027-01-10'),
      sp('2027-02-10'),
      sp('2027-03-10'),
    ]);
  });

  it('returns no date before nextExecution without startDate', () => {
    const legacy = { ...monthlyDay31, dayOfMonth: 10, nextExecution: sp('2027-03-10') };
    expect(occurrencesBetween(legacy, sp('2027-01-05'), sp('2027-03-11'))).toEqual([
      sp('2027-03-10'),
    ]);
  });

  it('skips nextExecution when it falls before startDate', () => {
    const edited = {
      ...monthlyDay31,
      dayOfMonth: 10,
      startDate: sp('2027-02-10'),
      nextExecution: sp('2027-01-10'),
    };
    expect(occurrencesBetween(edited, sp('2026-11-01'), sp('2027-03-01'))).toEqual([
      sp('2027-02-10'),
    ]);
  });
});
