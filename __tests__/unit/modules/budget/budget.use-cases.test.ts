/**
 * Testes unitários para budget.service (reescrito contra a API atual).
 */
import { createBudgetUseCase } from '../../../../src/modules/budget/use-cases/create-budget.use-case';
import { deleteBudgetUseCase } from '../../../../src/modules/budget/use-cases/delete-budget.use-case';
import { getBudgetProgressByCategoryUseCase } from '../../../../src/modules/budget/use-cases/get-budget-progress-by-category.use-case';
import { getBudgetProgressUseCase } from '../../../../src/modules/budget/use-cases/get-budget-progress.use-case';
import { getBudgetStatus } from '../../../../src/modules/budget/helpers/budget-status';
import { listBudgetsUseCase } from '../../../../src/modules/budget/use-cases/list-budgets.use-case';
import { updateBudgetUseCase } from '../../../../src/modules/budget/use-cases/update-budget.use-case';
import { budgetRepository } from '../../../../src/modules/budget/repositories/budget.repository';
import { transactionRepository } from '../../../../src/repositories/transaction.repository';
import { financialPeriodService } from '../../../../src/modules/financial-period';
import { validateBudgetExists } from '../../../../src/modules/budget/validations/budget.validation';
import { HttpError } from '../../../../src/validations/errors';

jest.mock('../../../../src/modules/budget/repositories/budget.repository');
jest.mock('../../../../src/repositories/transaction.repository');
jest.mock('../../../../src/modules/budget/validations/budget.validation');
jest.mock('../../../../src/modules/financial-period', () => ({
  financialPeriodService: {
    ensureCurrentPeriodExists: jest.fn().mockResolvedValue({ id: 'p1' }),
    getPeriodById: jest.fn().mockResolvedValue({ id: 'p1' }),
  },
}));
jest.mock('../../../../src/modules/user/validations/user.validation', () => ({
  requireUser: jest.fn().mockResolvedValue({ id: 'user-123' }),
}));

const budgetRepo = budgetRepository as jest.Mocked<typeof budgetRepository>;
const txRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const periodSvc = financialPeriodService as jest.Mocked<typeof financialPeriodService>;
const mockedValidateBudgetExists = validateBudgetExists as jest.Mock;

const USER = 'user-123';

const budgetWithCat = (over: Record<string, unknown> = {}) => ({
  id: 'budget-1',
  monthlyLimit: '1000',
  category: { id: 'cat-1', name: 'Alimentação' },
  ...over,
});

const expense = (amount: string, catId = 'cat-1') => ({
  id: 'tx',
  type: 'expense',
  amount,
  category: { id: catId, name: 'x' },
});

beforeEach(() => {
  jest.clearAllMocks();
  periodSvc.ensureCurrentPeriodExists.mockResolvedValue({ id: 'p1' } as never);
  periodSvc.getPeriodById.mockResolvedValue({ id: 'p1' } as never);
});

describe('createBudgetUseCase', () => {
  it('creates budget (limit becomes string)', async () => {
    budgetRepo.findByUserIdAndCategoryId.mockResolvedValue(null);
    budgetRepo.create.mockResolvedValue({ id: 'b1' } as never);

    const r = await createBudgetUseCase(USER, {
      categoryId: 'cat-1',
      monthlyLimit: 1500.5,
    });

    expect(budgetRepo.create).toHaveBeenCalledWith({
      userId: USER,
      categoryId: 'cat-1',
      monthlyLimit: '1500.5',
    });
    expect(r).toEqual({ id: 'b1' });
  });

  it('rejects duplicate (409)', async () => {
    budgetRepo.findByUserIdAndCategoryId.mockResolvedValue({ id: 'x' } as never);
    await expect(
      createBudgetUseCase(USER, { categoryId: 'cat-1', monthlyLimit: 100 })
    ).rejects.toThrow(HttpError);
    expect(budgetRepo.create).not.toHaveBeenCalled();
  });
});

describe('listBudgetsUseCase', () => {
  it('computes spent/remaining/percentage/status for current period', async () => {
    budgetRepo.getBudgetWithCategory.mockResolvedValue([budgetWithCat()] as never);
    txRepo.findByPeriodId.mockResolvedValue([expense('250'), expense('150')] as never);

    const r = await listBudgetsUseCase(USER);

    expect(periodSvc.ensureCurrentPeriodExists).toHaveBeenCalledWith(USER);
    expect(r[0]).toMatchObject({
      spent: 400,
      remaining: 600,
      percentage: 40,
      status: 'safe',
    });
  });

  it('uses getPeriodById when periodId provided', async () => {
    budgetRepo.getBudgetWithCategory.mockResolvedValue([] as never);
    txRepo.findByPeriodId.mockResolvedValue([] as never);

    await listBudgetsUseCase(USER, 'period-9');

    expect(periodSvc.getPeriodById).toHaveBeenCalledWith('period-9', USER);
  });

  it('nonexistent period → 404', async () => {
    budgetRepo.getBudgetWithCategory.mockResolvedValue([] as never);
    periodSvc.ensureCurrentPeriodExists.mockResolvedValue(null as never);

    await expect(listBudgetsUseCase(USER)).rejects.toThrow(HttpError);
  });
});

describe('updateBudgetUseCase', () => {
  it('validates existence and updates with string limit', async () => {
    mockedValidateBudgetExists.mockResolvedValue(undefined);
    budgetRepo.update.mockResolvedValue({ id: 'b1' } as never);

    const r = await updateBudgetUseCase(USER, 'b1', { monthlyLimit: 2000 });

    expect(mockedValidateBudgetExists).toHaveBeenCalledWith('b1', USER);
    expect(budgetRepo.update).toHaveBeenCalledWith('b1', {
      monthlyLimit: '2000',
    });
    expect(r).toEqual({ id: 'b1' });
  });

  it('propagates validation error', async () => {
    mockedValidateBudgetExists.mockRejectedValue(new HttpError(404, 'Orçamento não encontrado'));
    await expect(updateBudgetUseCase(USER, 'b1', { monthlyLimit: 1 })).rejects.toThrow(HttpError);
    expect(budgetRepo.update).not.toHaveBeenCalled();
  });
});

describe('deleteBudgetUseCase', () => {
  it('validates existence and deletes', async () => {
    mockedValidateBudgetExists.mockResolvedValue(undefined);
    budgetRepo.delete.mockResolvedValue(true as never);

    const r = await deleteBudgetUseCase(USER, 'b1');

    expect(mockedValidateBudgetExists).toHaveBeenCalledWith('b1', USER);
    expect(budgetRepo.delete).toHaveBeenCalledWith('b1');
    expect(r).toBe(true);
  });
});

describe('getBudgetStatus', () => {
  it('thresholds safe/attention/warning/exceeded', () => {
    expect(getBudgetStatus(0)).toBe('safe');
    expect(getBudgetStatus(74.99)).toBe('safe');
    expect(getBudgetStatus(75)).toBe('attention');
    expect(getBudgetStatus(89.99)).toBe('attention');
    expect(getBudgetStatus(90)).toBe('warning');
    expect(getBudgetStatus(99.99)).toBe('warning');
    expect(getBudgetStatus(100)).toBe('exceeded');
    expect(getBudgetStatus(150)).toBe('exceeded');
  });
});

describe('getBudgetProgressUseCase', () => {
  it('percentage capped at 100 and remaining non-negative', async () => {
    budgetRepo.getBudgetWithCategory.mockResolvedValue([budgetWithCat()] as never);
    txRepo.findByPeriodId.mockResolvedValue([expense('1200')] as never);

    const r = await getBudgetProgressUseCase(USER);

    expect(r[0]).toMatchObject({
      spent: 1200,
      remaining: 0,
      percentage: 100,
      status: 'exceeded',
    });
  });
});

describe('getBudgetProgressByCategory', () => {
  it('no budget → safe 0%', async () => {
    budgetRepo.findByCategoryId.mockResolvedValue(null);

    const r = await getBudgetProgressByCategoryUseCase(USER, 'cat-1');

    expect(r).toEqual({ percentage: 0, status: 'safe' });
  });

  it('with budget computes percentage/status', async () => {
    budgetRepo.findByCategoryId.mockResolvedValue({
      monthlyLimit: '1000',
    } as never);
    txRepo.findByPeriodId.mockResolvedValue([expense('950')] as never);

    const r = await getBudgetProgressByCategoryUseCase(USER, 'cat-1');

    expect(r.percentage).toBeCloseTo(95);
    expect(r.status).toBe('warning');
  });
});
