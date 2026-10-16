import { processUserSpendingAlert } from '@modules/notification';
import { overtimeRepository } from '@modules/overtime/repositories/overtime.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { deleteTransactionUseCase } from '@modules/transaction/use-cases/delete-transaction.use-case';

jest.mock('@modules/notification');
jest.mock('@modules/overtime/repositories/overtime.repository');
jest.mock('@modules/transaction/repositories/transaction.repository');

const mockedTransactionRepository = transactionRepository as jest.Mocked<
  typeof transactionRepository
>;
const mockedOvertimeRepository = overtimeRepository as jest.Mocked<typeof overtimeRepository>;

const USER_ID = '11111111-1111-1111-1111-111111111111';
const TRANSACTION_ID = '22222222-2222-2222-2222-222222222222';
const OVERTIME_ID = '33333333-3333-3333-3333-333333333333';

beforeEach(() => {
  jest.clearAllMocks();
  mockedOvertimeRepository.clearTransactionId.mockResolvedValue();
});

describe('deleteTransactionUseCase', () => {
  it('unlinks the overtime record when the transaction is deleted', async () => {
    mockedTransactionRepository.delete.mockResolvedValue({
      id: TRANSACTION_ID,
      userId: USER_ID,
      type: 'income',
      overtimeRecordId: OVERTIME_ID,
      periodId: null,
    } as never);

    await deleteTransactionUseCase(TRANSACTION_ID, USER_ID);

    expect(mockedOvertimeRepository.clearTransactionId).toHaveBeenCalledWith(OVERTIME_ID, USER_ID);
    expect(processUserSpendingAlert).not.toHaveBeenCalled();
  });

  it('does not touch overtime when the transaction has no link', async () => {
    mockedTransactionRepository.delete.mockResolvedValue({
      id: TRANSACTION_ID,
      userId: USER_ID,
      type: 'income',
      overtimeRecordId: null,
      periodId: null,
    } as never);

    await deleteTransactionUseCase(TRANSACTION_ID, USER_ID);

    expect(mockedOvertimeRepository.clearTransactionId).not.toHaveBeenCalled();
  });

  it('throws 404 without side effects when the transaction does not exist', async () => {
    mockedTransactionRepository.delete.mockResolvedValue(null);

    await expect(deleteTransactionUseCase(TRANSACTION_ID, USER_ID)).rejects.toEqual(
      expect.objectContaining({ status: 404 })
    );
    expect(mockedOvertimeRepository.clearTransactionId).not.toHaveBeenCalled();
    expect(processUserSpendingAlert).not.toHaveBeenCalled();
  });
});
