import { Response } from "express";
import { getAvailableFinancialPeriods } from "../helpers/financial-period";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { FinancialPeriodRepository } from "../repositories/financial-period.repository";
import { UserRepository } from "../repositories/user.repository";
import { updateUserProfileService } from "../services/user.service";

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const user = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      monthlyIncome: req.user.monthlyIncome ?? 0,
      financialDayStart: req.user.financialDayStart ?? 1,
      financialDayEnd: req.user.financialDayEnd ?? 31,
      firstAccess: req.user.firstAccess,
      createdAt: req.user.createdAt,
    };

    return ResponseHandler.success(
      res,
      { user },
      "Dados do usuário recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.serverError(res);
  }
};

export const updateMonthlyIncome = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { monthlyIncome } = req.body;

    // Usando o serviço com o usuário já validado
    const updatedUser = await updateUserProfileService(req.user, {
      monthlyIncome,
    });

    return ResponseHandler.success(
      res,
      {
        monthlyIncome: updatedUser.monthlyIncome,
        firstAccess: false,
      },
      "Rendimento atualizado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.serverError(res);
  }
};

export const updateFinancialPeriod = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { financialDayStart, financialDayEnd } = req.body;

    const user = await UserRepository.updateFinancialPeriod(
      req.userId,
      financialDayStart,
      financialDayEnd
    );

    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    return ResponseHandler.success(
      res,
      {
        financialDayStart,
        financialDayEnd,
        firstAccess: false,
      },
      "Período financeiro atualizado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.serverError(res);
  }
};

export const updateIncomeAndPeriod = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { monthlyIncome, financialDayStart, financialDayEnd } = req.body;

    const user = await UserRepository.updateIncomeAndPeriod(
      req.userId,
      monthlyIncome,
      financialDayStart,
      financialDayEnd
    );

    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    return ResponseHandler.success(
      res,
      {
        monthlyIncome,
        financialDayStart,
        financialDayEnd,
        firstAccess: false,
      },
      "Rendimento e período financeiro atualizados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.serverError(res);
  }
};

export const getFinancialPeriods = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { user } = req;

  if (!user) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  const { id: userId, financialDayStart, financialDayEnd } = user;

  try {
    // Gerar todos os períodos disponíveis (incluindo sem transações)
    const allPeriods = getAvailableFinancialPeriods(
      financialDayStart ?? 1,
      financialDayEnd ?? 31,
      []
    );

    // Buscar períodos armazenados no banco
    const storedPeriods = await FinancialPeriodRepository.findActiveByUser(
      userId
    );

    // Marcar quais períodos estão armazenados no banco
    const periodsWithStatus = allPeriods.map((period) => {
      const isStored = storedPeriods.some(
        (stored) =>
          stored.startDate.getTime() === period.startDate.getTime() &&
          stored.endDate.getTime() === period.endDate.getTime()
      );

      return {
        ...period,
        isStored,
        // Se estiver armazenado, usar o ID do banco
        id: isStored
          ? storedPeriods.find(
              (stored) =>
                stored.startDate.getTime() === period.startDate.getTime() &&
                stored.endDate.getTime() === period.endDate.getTime()
            )?.id || period.id
          : period.id,
      };
    });

    return ResponseHandler.success(
      res,
      periodsWithStatus,
      "Períodos financeiros recuperados com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao buscar períodos financeiros",
      error
    );
  }
};

export const getFinancialPeriodById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { user } = req;
  const { periodId } = req.params;

  if (!user) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  const { id: userId } = user;

  try {
    // Aqui você precisaria adicionar um método no repository
    // const period = await FinancialPeriodRepository.findById(periodId, userId);

    // Por enquanto, vamos buscar todos e filtrar
    const periods = await FinancialPeriodRepository.findActiveByUser(userId);
    const period = periods.find((p) => p.id === periodId);

    if (!period) {
      return ResponseHandler.error(
        res,
        "Período financeiro não encontrado",
        null,
        404
      );
    }

    return ResponseHandler.success(
      res,
      period,
      "Período financeiro recuperado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Erro ao buscar período financeiro",
      error
    );
  }
};
