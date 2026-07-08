/**
 * Unit tests for the subscription service (factory with injected dependencies).
 */
import {
  makeSubscriptionService,
  type SubscriptionServiceDeps,
} from '../../../src/services/subscription.service';

const USER = 'user-123';

const buildDeps = () => {
  const deps = {
    transactionRepository: {
      findAllByUserId: jest.fn(),
    },
    requireUser: jest.fn().mockResolvedValue({ id: USER }),
  };
  return deps as unknown as SubscriptionServiceDeps & typeof deps;
};

const expense = (amount: string, date: Date, title = 'Spotify') => ({
  id: 't' + Math.random(),
  type: 'expense',
  title,
  amount,
  description: null,
  date,
  periodId: null,
  recurringTransactionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: 'c1', name: 'Streaming' },
});

describe('subscription service', () => {
  it('returns no candidates when the user has no transactions', async () => {
    const deps = buildDeps();
    deps.transactionRepository.findAllByUserId.mockResolvedValue([]);

    const service = makeSubscriptionService(deps);
    const result = await service.detect(USER);

    expect(deps.requireUser).toHaveBeenCalledWith(USER);
    expect(result).toEqual([]);
  });

  it('detects a recurring monthly charge as a subscription candidate', async () => {
    const deps = buildDeps();
    deps.transactionRepository.findAllByUserId.mockResolvedValue([
      expense('19.90', new Date('2026-01-10')),
      expense('19.90', new Date('2026-02-10')),
      expense('19.90', new Date('2026-03-10')),
    ]);

    const service = makeSubscriptionService(deps);
    const result = await service.detect(USER);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]!.title).toBe('Spotify');
  });
});
