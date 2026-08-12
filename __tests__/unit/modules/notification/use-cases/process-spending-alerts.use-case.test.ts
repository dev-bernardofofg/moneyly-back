import { processUserSpendingAlert } from '@modules/notification/use-cases/process-spending-alerts.use-case';
import { notificationRepository } from '@modules/notification/repositories/notification.repository';
import { financialPeriodService } from '@modules/financial-period';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { userRepository } from '@modules/user';

jest.mock('@modules/notification/repositories/notification.repository');
jest.mock('@modules/notification/services/push.service', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/financial-period');
jest.mock('@modules/transaction/repositories/transaction.repository');
jest.mock('@modules/user');

const mockedRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockedPeriod = financialPeriodService as jest.Mocked<typeof financialPeriodService>;
const mockedTx = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockedUser = userRepository as jest.Mocked<typeof userRepository>;

const USER = '11111111-1111-1111-1111-111111111111';
const PERIOD = { id: '22222222-2222-2222-2222-222222222222' };

const expense = (amount: string) =>
  ({
    type: 'expense',
    amount,
  }) as never;

const key = (status: string) => `spending:${USER}:${PERIOD.id}:${status}`;

beforeEach(() => {
  jest.clearAllMocks();
  mockedPeriod.ensureCurrentPeriodExists.mockResolvedValue(PERIOD as never);
  mockedUser.findById.mockResolvedValue({ id: USER, monthlyIncome: '2000' } as never);
  mockedRepo.findByDedupeKey.mockResolvedValue(null);
  mockedRepo.create.mockResolvedValue({} as never);
  mockedRepo.deleteByDedupeKeys.mockResolvedValue(0);
});

describe('processUserSpendingAlert', () => {
  it('creates notification when spending reaches 75% (info / attention)', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('1500')]);

    await processUserSpendingAlert(USER);

    expect(mockedRepo.create).toHaveBeenCalledTimes(1);
    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.type).toBe('spending_alert');
    expect(arg.severity).toBe('info');
    expect(arg.dedupeKey).toBe(key('attention'));
    expect(arg.message).toContain('75%');
    expect(mockedRepo.deleteByDedupeKeys).toHaveBeenCalledWith([key('warning'), key('exceeded')]);
  });

  it('creates warning notification at 90%', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('1800')]);

    await processUserSpendingAlert(USER);

    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.severity).toBe('warning');
    expect(arg.dedupeKey).toBe(key('warning'));
    expect(arg.message).toContain('90%');
    expect(mockedRepo.deleteByDedupeKeys).toHaveBeenCalledWith([key('exceeded')]);
  });

  it('creates danger notification when spending exceeds 100%', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('2100')]);

    await processUserSpendingAlert(USER);

    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.severity).toBe('danger');
    expect(arg.dedupeKey).toBe(key('exceeded'));
    expect(mockedRepo.deleteByDedupeKeys).not.toHaveBeenCalled();
  });

  it('safe status → remove all spending alerts and skip create', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('1000')]);

    await processUserSpendingAlert(USER);

    expect(mockedRepo.deleteByDedupeKeys).toHaveBeenCalledWith([
      key('attention'),
      key('warning'),
      key('exceeded'),
    ]);
    expect(mockedRepo.findByDedupeKey).not.toHaveBeenCalled();
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('when spending drops from exceeded to attention → prune higher statuses', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('1500')]);

    await processUserSpendingAlert(USER, PERIOD.id);

    expect(mockedPeriod.ensureCurrentPeriodExists).not.toHaveBeenCalled();
    expect(mockedRepo.deleteByDedupeKeys).toHaveBeenCalledWith([key('warning'), key('exceeded')]);
    expect(mockedRepo.create.mock.calls[0]![0].dedupeKey).toBe(key('attention'));
  });

  it('skips when monthlyIncome is 0', async () => {
    mockedUser.findById.mockResolvedValue({ id: USER, monthlyIncome: '0' } as never);

    await processUserSpendingAlert(USER);

    expect(mockedTx.findByPeriodId).not.toHaveBeenCalled();
    expect(mockedRepo.create).not.toHaveBeenCalled();
    expect(mockedRepo.deleteByDedupeKeys).not.toHaveBeenCalled();
  });

  it('skips when user does not exist', async () => {
    mockedUser.findById.mockResolvedValue(null);

    await processUserSpendingAlert(USER);

    expect(mockedPeriod.ensureCurrentPeriodExists).not.toHaveBeenCalled();
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('idempotent: dedupeKey already exists → no create', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('1800')]);
    mockedRepo.findByDedupeKey.mockResolvedValue({ id: 'n1' } as never);

    await processUserSpendingAlert(USER);

    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it('scheduler race: create throws pg 23505 → does not propagate', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('1800')]);
    const uniqueViolation = Object.assign(new Error('unique violation'), { code: '23505' });
    mockedRepo.create.mockRejectedValue(uniqueViolation);

    await expect(processUserSpendingAlert(USER)).resolves.toBeUndefined();
  });

  it('unexpected create error propagates', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([expense('1800')]);
    mockedRepo.create.mockRejectedValue(new Error('db down'));

    await expect(processUserSpendingAlert(USER)).rejects.toThrow('db down');
  });

  it('ignores income transactions when computing percentage', async () => {
    mockedTx.findByPeriodId.mockResolvedValue([
      expense('1800'),
      { type: 'income', amount: '5000' } as never,
    ]);

    await processUserSpendingAlert(USER);

    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.dedupeKey).toBe(key('warning'));
  });
});
