import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import type { AuthRequest } from '@modules/auth/middlewares/auth';
import { financialPeriodService } from '@modules/financial-period';
import { updateFinancialPeriodUseCase } from './use-cases/update-financial-period.use-case';
import { updateIncomeAndPeriodUseCase } from './use-cases/update-income-and-period.use-case';
import { updateUserProfileUseCase } from './use-cases/update-user-profile.use-case';
import { NotFoundError } from '@core/errors';

export const getMe = asyncHandler<AuthRequest>(async (req, res) => {
  const {
    id,
    name,
    email,
    monthlyIncome,
    financialDayStart,
    financialDayEnd,
    firstAccess,
    createdAt,
  } = req.user;

  return ResponseHandler.success(
    res,
    {
      id,
      name,
      email,
      monthlyIncome: monthlyIncome ?? 0,
      financialDayStart: financialDayStart ?? 1,
      financialDayEnd: financialDayEnd ?? 31,
      firstAccess,
      createdAt,
    },
    'Dados do usuário recuperados com sucesso'
  );
});

export const updateMonthlyIncome = asyncHandler<AuthRequest>(async (req, res) => {
  const { monthlyIncome } = req.body;
  const updatedUser = await updateUserProfileUseCase(req.user, { monthlyIncome });
  return ResponseHandler.success(
    res,
    { monthlyIncome: updatedUser.monthlyIncome, firstAccess: false },
    'Rendimento atualizado com sucesso'
  );
});

export const updateFinancialPeriod = asyncHandler<AuthRequest>(async (req, res) => {
  const { financialDayStart, financialDayEnd } = req.body;
  await updateFinancialPeriodUseCase(req.user.id, financialDayStart, financialDayEnd);
  return ResponseHandler.success(
    res,
    { financialDayStart, financialDayEnd, firstAccess: false },
    'Período financeiro atualizado com sucesso'
  );
});

export const updateIncomeAndPeriod = asyncHandler<AuthRequest>(async (req, res) => {
  const { monthlyIncome, financialDayStart, financialDayEnd } = req.body;
  await updateIncomeAndPeriodUseCase(
    req.user.id,
    monthlyIncome,
    financialDayStart,
    financialDayEnd
  );
  return ResponseHandler.success(
    res,
    { monthlyIncome, financialDayStart, financialDayEnd, firstAccess: false },
    'Rendimento e período financeiro atualizados com sucesso'
  );
});

export const getFinancialPeriods = asyncHandler<AuthRequest>(async (req, res) => {
  const periods = await financialPeriodService.getUserPeriods(req.user.id);
  return ResponseHandler.success(res, periods, 'Períodos financeiros recuperados com sucesso');
});

export const getFinancialPeriodById = asyncHandler<AuthRequest>(async (req, res) => {
  const { periodId } = req.params;
  if (!periodId) return ResponseHandler.badRequest(res, 'ID do período não informado');

  const period = await financialPeriodService.getPeriodById(periodId, req.user.id);
  if (!period) throw new NotFoundError('Período financeiro não encontrado');
  return ResponseHandler.success(res, period, 'Período financeiro recuperado com sucesso');
});
