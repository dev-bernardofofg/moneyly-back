/**
 * Unit tests for the budget service (factory with injected dependencies).
 */
import {
  getBudgetStatus,
  makeBudgetService,
  type BudgetServiceDeps,
} from '../../../src/services/budget.service';
import { HttpError } from '../../../src/validations/errors';

const USER = 'user-123';

const buildDeps = () => {
  const deps = {
    budgetRepository: {
      create: jest.fn(),
      findByUserIdAndCategoryId: jest.fn(),
      findByCategoryId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getBudgetWithCategory: jest.fn(),
    },
    transactionRepository: {
      findByPeriodId: jest.fn(),
    },
    financialPeriodService: {
      ensureCurrentPeriodExists: jest.fn().mockResolvedValue({ id: 'p1' }),
      getPeriodById: jest.fn().mockResolvedValue({ id: 'p1' }),
    },
    requireUser: jest.fn().mockResolvedValue({ id: USER }),
    validateBudgetExists: jest.fn(),
  };
  return deps as unknown as BudgetServiceDeps & typeof deps;
};

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

describe('create', () => {
  it('creates budget (limit becomes string)', async () => {
    const deps = buildDeps();
    deps.budgetRepository.findByUserIdAndCategoryId.mockResolvedValue(null);
    deps.budgetRepository.create.mockResolvedValue({ id: 'b1' });

    const service = makeBudgetService(deps);
    const r = await service.create(USER, { categoryId: 'cat-1', monthlyLimit: 1500.5 });

    expect(deps.budgetRepository.create).toHaveBeenCalledWith({
      userId: USER,
      categoryId: 'cat-1',
      monthlyLimit: '1500.5',
    });
    expect(r).toEqual({ id: 'b1' });
  });

  it('rejects duplicate (409)', async () => {
    const deps = buildDeps();
    deps.budgetRepository.findByUserIdAndCategoryId.mockResolvedValue({ id: 'x' });

    const service = makeBudgetService(deps);

    await expect(service.create(USER, { categoryId: 'cat-1', monthlyLimit: 100 })).rejects.toThrow(
      HttpError
    );
    expect(deps.budgetRepository.create).not.toHaveBeenCalled();
  });
});

describe('getUserBudgets', () => {
  it('computes spent/remaining/percentage/status for current period', async () => {
    const deps = buildDeps();
    deps.budgetRepository.getBudgetWithCategory.mockResolvedValue([budgetWithCat()]);
    deps.transactionRepository.findByPeriodId.mockResolvedValue([expense('250'), expense('150')]);

    const service = makeBudgetService(deps);
    const r = await service.getUserBudgets(USER);

    expect(deps.financialPeriodService.ensureCurrentPeriodExists).toHaveBeenCalledWith(USER);
    expect(r[0]).toMatchObject({
      spent: 400,
      remaining: 600,
      percentage: 40,
      status: 'safe',
    });
  });

  it('uses getPeriodById when periodId provided', async () => {
    const deps = buildDeps();
    deps.budgetRepository.getBudgetWithCategory.mockResolvedValue([]);
    deps.transactionRepository.findByPeriodId.mockResolvedValue([]);

    const service = makeBudgetService(deps);
    await service.getUserBudgets(USER, 'period-9');

    expect(deps.financialPeriodService.getPeriodById).toHaveBeenCalledWith('period-9', USER);
  });

  it('nonexistent period → 404', async () => {
    const deps = buildDeps();
    deps.budgetRepository.getBudgetWithCategory.mockResolvedValue([]);
    deps.financialPeriodService.ensureCurrentPeriodExists.mockResolvedValue(null);

    const service = makeBudgetService(deps);

    await expect(service.getUserBudgets(USER)).rejects.toThrow(HttpError);
  });
});

describe('update', () => {
  it('validates existence and updates with string limit', async () => {
    const deps = buildDeps();
    deps.validateBudgetExists.mockResolvedValue(undefined);
    deps.budgetRepository.update.mockResolvedValue({ id: 'b1' });

    const service = makeBudgetService(deps);
    const r = await service.update(USER, 'b1', { monthlyLimit: 2000 });

    expect(deps.validateBudgetExists).toHaveBeenCalledWith('b1', USER);
    expect(deps.budgetRepository.update).toHaveBeenCalledWith('b1', { monthlyLimit: '2000' });
    expect(r).toEqual({ id: 'b1' });
  });

  it('propagates validation error', async () => {
    const deps = buildDeps();
    deps.validateBudgetExists.mockRejectedValue(new HttpError(404, 'Orçamento não encontrado'));

    const service = makeBudgetService(deps);

    await expect(service.update(USER, 'b1', { monthlyLimit: 1 })).rejects.toThrow(HttpError);
    expect(deps.budgetRepository.update).not.toHaveBeenCalled();
  });
});

describe('delete', () => {
  it('validates existence and deletes', async () => {
    const deps = buildDeps();
    deps.validateBudgetExists.mockResolvedValue(undefined);
    deps.budgetRepository.delete.mockResolvedValue(true);

    const service = makeBudgetService(deps);
    const r = await service.delete(USER, 'b1');

    expect(deps.validateBudgetExists).toHaveBeenCalledWith('b1', USER);
    expect(deps.budgetRepository.delete).toHaveBeenCalledWith('b1');
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

describe('getProgress', () => {
  it('percentage capped at 100 and remaining non-negative', async () => {
    const deps = buildDeps();
    deps.budgetRepository.getBudgetWithCategory.mockResolvedValue([budgetWithCat()]);
    deps.transactionRepository.findByPeriodId.mockResolvedValue([expense('1200')]);

    const service = makeBudgetService(deps);
    const r = await service.getProgress(USER);

    expect(r[0]).toMatchObject({
      spent: 1200,
      remaining: 0,
      percentage: 100,
      status: 'exceeded',
    });
  });
});

describe('getProgressByCategory', () => {
  it('no budget → safe 0%', async () => {
    const deps = buildDeps();
    deps.budgetRepository.findByCategoryId.mockResolvedValue(null);

    const service = makeBudgetService(deps);
    const r = await service.getProgressByCategory(USER, 'cat-1');

    expect(r).toEqual({ percentage: 0, status: 'safe' });
  });

  it('with budget computes percentage/status', async () => {
    const deps = buildDeps();
    deps.budgetRepository.findByCategoryId.mockResolvedValue({ monthlyLimit: '1000' });
    deps.transactionRepository.findByPeriodId.mockResolvedValue([expense('950')]);

    const service = makeBudgetService(deps);
    const r = await service.getProgressByCategory(USER, 'cat-1');

    expect(r.percentage).toBeCloseTo(95);
    expect(r.status).toBe('warning');
  });
});
