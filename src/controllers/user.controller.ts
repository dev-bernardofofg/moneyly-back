import { Response } from "express";
import { ResponseHandler } from "../helpers/response-handler";
import { AuthenticatedRequest } from "../middlewares/auth";
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
