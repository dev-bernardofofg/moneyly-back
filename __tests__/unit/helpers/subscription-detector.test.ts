import {
  groupSubscriptionCandidates,
  normalizeTitle,
} from '../../../src/helpers/subscription-detector';

type Tx = Parameters<typeof groupSubscriptionCandidates>[0][number];

const tx = (over: Partial<Tx>): Tx =>
  ({
    id: 't',
    type: 'expense',
    title: 'Spotify',
    amount: '19.90',
    description: null,
    date: new Date('2026-01-10'),
    periodId: null,
    recurringTransactionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 'c1', name: 'Streaming' },
    ...over,
  }) as Tx;

describe('normalizeTitle', () => {
  it('strips accents and trailing numeric suffix', () => {
    expect(normalizeTitle('Spotify 03/12')).toBe('spotify');
    expect(normalizeTitle('Energia Elétrica')).toBe('energia eletrica');
  });
});

describe('groupSubscriptionCandidates', () => {
  it('3 monthly charges same amount → 1 monthly candidate', () => {
    const r = groupSubscriptionCandidates([
      tx({ date: new Date('2026-01-10') }),
      tx({ date: new Date('2026-02-10') }),
      tx({ date: new Date('2026-03-10') }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.cadence).toBe('monthly');
    expect(r[0]!.occurrences).toBe(3);
    expect(r[0]!.monthlyCost).toBeCloseTo(19.9);
  });

  it('<3 occurrences → empty', () => {
    const r = groupSubscriptionCandidates([
      tx({ date: new Date('2026-01-10') }),
      tx({ date: new Date('2026-02-10') }),
    ]);
    expect(r).toEqual([]);
  });

  it('already modeled as recurring → excluded', () => {
    const r = groupSubscriptionCandidates([
      tx({ date: new Date('2026-01-10'), recurringTransactionId: 'r1' }),
      tx({ date: new Date('2026-02-10'), recurringTransactionId: 'r1' }),
      tx({ date: new Date('2026-03-10'), recurringTransactionId: 'r1' }),
    ]);
    expect(r).toEqual([]);
  });

  it('inconsistent amount (>10%) → does not group', () => {
    const r = groupSubscriptionCandidates([
      tx({ date: new Date('2026-01-10'), amount: '10' }),
      tx({ date: new Date('2026-02-10'), amount: '100' }),
      tx({ date: new Date('2026-03-10'), amount: '10' }),
    ]);
    expect(r).toEqual([]);
  });

  it('irregular cadence → discarded', () => {
    const r = groupSubscriptionCandidates([
      tx({ date: new Date('2026-01-01') }),
      tx({ date: new Date('2026-01-03') }),
      tx({ date: new Date('2026-06-01') }),
    ]);
    expect(r).toEqual([]);
  });
});
