import { processUserBudgetAlerts } from '../../../../../src/modules/notification/use-cases/process-budget-alerts.use-case';
import { notificationRepository } from '../../../../../src/modules/notification/repositories/notification.repository';
import { financialPeriodService } from '../../../../../src/modules/financial-period';
import { getBudgetProgressUseCase } from '../../../../../src/modules/budget';

jest.mock('../../../../../src/modules/notification/repositories/notification.repository');
jest.mock('../../../../../src/modules/financial-period');
jest.mock('../../../../../src/modules/budget');

const mockedRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockedPeriod = financialPeriodService as jest.Mocked<typeof financialPeriodService>;
const mockedBudget = getBudgetProgressUseCase as jest.Mock;

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
