/**
 * Testes unitários para detectSubscriptionsUseCase (orquestração).
 * A heurística de detecção em si é coberta em subscription-detector.test.ts;
 * aqui validamos requireUser, os argumentos passados ao repositório e o
 * repasse das transações ao detector.
 */
import { detectSubscriptionsUseCase } from '@modules/subscription/use-cases/detect-subscriptions.use-case';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { requireUser } from '@modules/user/validations/user.validation';
import { HttpError } from '@core/errors/http-error';

jest.mock('@modules/transaction/repositories/transaction.repository');
jest.mock('@modules/user/validations/user.validation');

const mockedRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockedRequireUser = requireUser as jest.Mock;

const USER = 'user-123';

type Tx = Awaited<ReturnType<typeof transactionRepository.findAllByUserId>>[number];

const expense = (date: Date, title = 'Spotify', amount = '19.90'): Tx =>
  ({
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
  }) as Tx;

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequireUser.mockResolvedValue({ id: USER });
});

describe('detectSubscriptionsUseCase', () => {
  it('returns no candidates when the user has no transactions', async () => {
    mockedRepo.findAllByUserId.mockResolvedValue([]);

    const result = await detectSubscriptionsUseCase(USER);

    expect(mockedRequireUser).toHaveBeenCalledWith(USER);
    expect(mockedRepo.findAllByUserId).toHaveBeenCalledWith(USER);
    expect(result).toEqual([]);
  });

  it('feeds repository transactions to the detector and returns its candidates', async () => {
    mockedRepo.findAllByUserId.mockResolvedValue([
      expense(new Date('2026-01-10')),
      expense(new Date('2026-02-10')),
      expense(new Date('2026-03-10')),
    ]);

    const result = await detectSubscriptionsUseCase(USER);

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Spotify');
    expect(result[0]!.cadence).toBe('monthly');
  });

  it('rejects before touching the repository when requireUser fails', async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, 'Usuário não autenticado'));

    await expect(detectSubscriptionsUseCase(USER)).rejects.toMatchObject({ status: 401 });
    expect(mockedRepo.findAllByUserId).not.toHaveBeenCalled();
  });
});
