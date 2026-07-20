import { notifyGoalMilestones } from '@modules/notification/use-cases/notify-goal-milestones.use-case';
import { notificationRepository } from '@modules/notification/repositories/notification.repository';

jest.mock('@modules/notification/repositories/notification.repository');

const mockedRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;

const USER = '11111111-1111-1111-1111-111111111111';

const goal = {
  id: 'g1',
  title: 'Viagem',
  targetAmount: '10000.00',
  currentAmount: '5000.00',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notifyGoalMilestones', () => {
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
