import {
  markNotificationReadService,
  notifyGoalMilestones,
  processUserBudgetAlerts,
} from '../../../src/services/notification.service';
import { notificationRepository } from '../../../src/repositories/notification.repository';
import { financialPeriodService } from '../../../src/services/financial-period.service';
import { getBudgetProgressService } from '../../../src/services/budget.service';
import { HttpError } from '../../../src/validations/errors';

jest.mock('../../../src/repositories/notification.repository');
jest.mock('../../../src/services/financial-period.service');
jest.mock('../../../src/services/budget.service');

const mockedRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockedPeriod = financialPeriodService as jest.Mocked<typeof financialPeriodService>;
const mockedBudget = getBudgetProgressService as jest.Mock;

const USER = '11111111-1111-1111-1111-111111111111';
const PERIOD = { id: '22222222-2222-2222-2222-222222222222' };

const budget = (status: string, id = 'b1') => ({
  id,
  monthlyLimit: '100',
  category: { id: 'c1', name: 'Comida' },
  spent: 0,
  remaining: 0,
  percentage: 100,
  status,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedPeriod.ensureCurrentPeriodExists.mockResolvedValue(PERIOD as never);
});

describe('processUserBudgetAlerts', () => {
  it('creates notification for exceeded budget (danger severity)', async () => {
    mockedBudget.mockResolvedValue([budget('exceeded')]);
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue({} as never);

    await processUserBudgetAlerts(USER);

    expect(mockedRepo.create).toHaveBeenCalledTimes(1);
    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.severity).toBe('danger');
    expect(arg.dedupeKey).toBe(`budget:b1:${PERIOD.id}:exceeded`);
  });

  it('idempotent: dedupeKey already exists → no create', async () => {
    mockedBudget.mockResolvedValue([budget('warning')]);
    mockedRepo.findByDedupeKey.mockResolvedValue({ id: 'n1' } as never);

    await processUserBudgetAlerts(USER);

    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('safe status → no notification', async () => {
    mockedBudget.mockResolvedValue([budget('safe')]);
    await processUserBudgetAlerts(USER);
    expect(mockedRepo.findByDedupeKey).not.toHaveBeenCalled();
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('scheduler race: create throws pg 23505 → does not propagate', async () => {
    mockedBudget.mockResolvedValue([budget('warning')]);
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    const uniqueViolation = Object.assign(new Error('unique violation'), { code: '23505' });
    mockedRepo.create.mockRejectedValue(uniqueViolation);

    await expect(processUserBudgetAlerts(USER)).resolves.toBeUndefined();
  });

  it('unexpected create error propagates', async () => {
    mockedBudget.mockResolvedValue([budget('warning')]);
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockRejectedValue(new Error('db down'));

    await expect(processUserBudgetAlerts(USER)).rejects.toThrow('db down');
  });
});

describe('notifyGoalMilestones', () => {
  const goal = {
    id: 'g1',
    title: 'Viagem',
    targetAmount: '10000.00',
    currentAmount: '5000.00',
  };

  it('creates info notification with goal dedupeKey', async () => {
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue({} as never);

    await notifyGoalMilestones(USER, goal, [{ percentage: 50 }]);

    expect(mockedRepo.create).toHaveBeenCalledTimes(1);
    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.type).toBe('goal_milestone');
    expect(arg.severity).toBe('info');
    expect(arg.dedupeKey).toBe('goal:g1:milestone:50');
    expect(arg.relatedId).toBe('g1');
    expect(arg.title).toContain('50%');
  });

  it('100% uses completion title', async () => {
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue({} as never);

    await notifyGoalMilestones(USER, goal, [{ percentage: 100 }]);

    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.title).toBe('Meta concluída: Viagem');
    expect(arg.message).toContain('Parabéns');
  });

  it('idempotent: dedupeKey already exists → no create', async () => {
    mockedRepo.findByDedupeKey.mockResolvedValue({ id: 'n1' } as never);

    await notifyGoalMilestones(USER, goal, [{ percentage: 25 }]);

    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('multiple milestones crossed in one deposit → one notification each', async () => {
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue({} as never);

    await notifyGoalMilestones(USER, goal, [
      { percentage: 25 },
      { percentage: 50 },
      { percentage: 75 },
    ]);

    expect(mockedRepo.create).toHaveBeenCalledTimes(3);
  });

  it('race: create throws pg 23505 → does not propagate', async () => {
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    const uniqueViolation = Object.assign(new Error('unique violation'), { code: '23505' });
    mockedRepo.create.mockRejectedValue(uniqueViolation);

    await expect(notifyGoalMilestones(USER, goal, [{ percentage: 25 }])).resolves.toBeUndefined();
  });
});

describe('markNotificationReadService', () => {
  it('not found → HttpError 404', async () => {
    mockedRepo.markRead.mockResolvedValue(null);
    await expect(markNotificationReadService('x', USER)).rejects.toThrow(HttpError);
  });
});
