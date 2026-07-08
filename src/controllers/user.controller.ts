import { ResponseHandler } from '../helpers/response-handler';
import { asyncHandler } from '../middlewares/async-handler';
import type { AuthRequest } from '../middlewares/auth';
import { financialPeriodService } from '../services/financial-period.service';
import { userService } from '../services/user.service';
import { NotFoundError } from '../services/errors';

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
  const updatedUser = await userService.updateProfile(req.user, { monthlyIncome });
  return ResponseHandler.success(
    res,
    { monthlyIncome: updatedUser.monthlyIncome, firstAccess: false },
    'Rendimento atualizado com sucesso'
  );
});

export const updateFinancialPeriod = asyncHandler<AuthRequest>(async (req, res) => {
  const { financialDayStart, financialDayEnd } = req.body;
  await userService.updateFinancialPeriod(req.user.id, financialDayStart, financialDayEnd);
  return ResponseHandler.success(
    res,
    { financialDayStart, financialDayEnd, firstAccess: false },
    'Período financeiro atualizado com sucesso'
  );
});

export const updateIncomeAndPeriod = asyncHandler<AuthRequest>(async (req, res) => {
  const { monthlyIncome, financialDayStart, financialDayEnd } = req.body;
  await userService.updateIncomeAndPeriod(
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
