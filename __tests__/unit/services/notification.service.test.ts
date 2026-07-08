/**
 * Unit tests for the notification service (factory with injected dependencies).
 */
import {
  makeNotificationService,
  type NotificationServiceDeps,
} from '../../../src/services/notification.service';
import { HttpError } from '../../../src/validations/errors';

jest.mock('../../../src/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const USER = '11111111-1111-1111-1111-111111111111';
const PERIOD = { id: '22222222-2222-2222-2222-222222222222' };

const buildDeps = () => {
  const deps = {
    notificationRepository: {
      create: jest.fn(),
      findByDedupeKey: jest.fn(),
      findByUserPaginated: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    },
    userRepository: {
      findAll: jest.fn(),
    },
    financialPeriodService: {
      ensureCurrentPeriodExists: jest.fn().mockResolvedValue(PERIOD),
    },
    getBudgetProgress: jest.fn(),
    requireUser: jest.fn().mockResolvedValue({ id: USER }),
  };
  return deps as unknown as NotificationServiceDeps & typeof deps;
};

const budget = (status: string, id = 'b1') => ({
  id,
  monthlyLimit: '100',
  category: { id: 'c1', name: 'Comida' },
  spent: 0,
  remaining: 0,
  percentage: 100,
  status,
});

describe('processUserBudgetAlerts', () => {
  it('creates notification for exceeded budget (danger severity)', async () => {
    const deps = buildDeps();
    deps.getBudgetProgress.mockResolvedValue([budget('exceeded')]);
    deps.notificationRepository.findByDedupeKey.mockResolvedValue(null);
    deps.notificationRepository.create.mockResolvedValue({});

    const service = makeNotificationService(deps);
    await service.processUserBudgetAlerts(USER);

    expect(deps.notificationRepository.create).toHaveBeenCalledTimes(1);
    const arg = deps.notificationRepository.create.mock.calls[0]![0];
    expect(arg.severity).toBe('danger');
    expect(arg.dedupeKey).toBe(`budget:b1:${PERIOD.id}:exceeded`);
  });

  it('idempotent: dedupeKey already exists → no create', async () => {
    const deps = buildDeps();
    deps.getBudgetProgress.mockResolvedValue([budget('warning')]);
    deps.notificationRepository.findByDedupeKey.mockResolvedValue({ id: 'n1' });

    const service = makeNotificationService(deps);
    await service.processUserBudgetAlerts(USER);

    expect(deps.notificationRepository.create).not.toHaveBeenCalled();
  });

  it('safe status → no notification', async () => {
    const deps = buildDeps();
    deps.getBudgetProgress.mockResolvedValue([budget('safe')]);

    const service = makeNotificationService(deps);
    await service.processUserBudgetAlerts(USER);

    expect(deps.notificationRepository.findByDedupeKey).not.toHaveBeenCalled();
    expect(deps.notificationRepository.create).not.toHaveBeenCalled();
  });

  it('scheduler race: dedupe unique violation (pg 23505) → does not propagate', async () => {
    const deps = buildDeps();
    deps.getBudgetProgress.mockResolvedValue([budget('warning')]);
    deps.notificationRepository.findByDedupeKey.mockResolvedValue(null);
    const raceError = Object.assign(new Error('unique violation'), { code: '23505' });
    deps.notificationRepository.create.mockRejectedValue(raceError);

    const service = makeNotificationService(deps);

    await expect(service.processUserBudgetAlerts(USER)).resolves.toBeUndefined();
  });

  it('non-dedupe create errors propagate', async () => {
    const deps = buildDeps();
    deps.getBudgetProgress.mockResolvedValue([budget('warning')]);
    deps.notificationRepository.findByDedupeKey.mockResolvedValue(null);
    deps.notificationRepository.create.mockRejectedValue(new Error('db down'));

    const service = makeNotificationService(deps);

    await expect(service.processUserBudgetAlerts(USER)).rejects.toThrow('db down');
  });
});

describe('processBudgetAlerts', () => {
  it('continues with the next user when one fails', async () => {
    const deps = buildDeps();
    deps.userRepository.findAll.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    deps.financialPeriodService.ensureCurrentPeriodExists
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(PERIOD);
    deps.getBudgetProgress.mockResolvedValue([]);

    const service = makeNotificationService(deps);

    await expect(service.processBudgetAlerts()).resolves.toBeUndefined();
    expect(deps.getBudgetProgress).toHaveBeenCalledWith('u2');
  });
});

describe('markRead', () => {
  it('not found → HttpError 404', async () => {
    const deps = buildDeps();
    deps.notificationRepository.markRead.mockResolvedValue(null);

    const service = makeNotificationService(deps);

    await expect(service.markRead('x', USER)).rejects.toThrow(HttpError);
  });
});
