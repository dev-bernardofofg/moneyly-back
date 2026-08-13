import { notifyTransactionCreated } from '@modules/notification/use-cases/notify-transaction-created.use-case';
import { notificationRepository } from '@modules/notification/repositories/notification.repository';
import type { Transaction } from '@infra/db/schema';

jest.mock('@modules/notification/repositories/notification.repository');
jest.mock('@modules/notification/services/push.service', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}));

const mockedRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;

const USER = '11111111-1111-1111-1111-111111111111';
const TX_ID = '22222222-2222-2222-2222-222222222222';

const baseTx = {
  id: TX_ID,
  userId: USER,
  title: 'Salário',
  amount: '3500.50',
  date: new Date('2026-08-13T03:00:00.000Z'),
  periodId: 'p1',
} as Transaction;

beforeEach(() => {
  jest.clearAllMocks();
  mockedRepo.findByDedupeKey.mockResolvedValue(null);
  mockedRepo.create.mockResolvedValue({} as never);
});

describe('notifyTransactionCreated', () => {
  it('notifies income with specific title, amount and date', async () => {
    await notifyTransactionCreated({ ...baseTx, type: 'income' });

    expect(mockedRepo.create).toHaveBeenCalledTimes(1);
    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.type).toBe('transaction_income');
    expect(arg.severity).toBe('info');
    expect(arg.title).toBe('Entrada: Salário');
    expect(arg.message).toContain('R$ 3500,50');
    expect(arg.message).toContain('13/08/2026');
    expect(arg.message).toContain('Salário');
    expect(arg.relatedId).toBe(TX_ID);
    expect(arg.dedupeKey).toBe(`transaction:${TX_ID}`);
  });

  it('notifies expense with specific title and amount', async () => {
    await notifyTransactionCreated({ ...baseTx, type: 'expense', title: 'Almoço' });

    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.type).toBe('transaction_expense');
    expect(arg.title).toBe('Saída: Almoço');
    expect(arg.message).toContain('saída de R$ 3500,50');
    expect(arg.message).toContain('Almoço');
  });

  it('idempotent: dedupeKey already exists → no create', async () => {
    mockedRepo.findByDedupeKey.mockResolvedValue({ id: 'n1' } as never);

    await notifyTransactionCreated({ ...baseTx, type: 'income' });

    expect(mockedRepo.create).not.toHaveBeenCalled();
  });
});
