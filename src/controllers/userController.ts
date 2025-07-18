import { Response } from "express";
import { ResponseHandler } from "../lib/ResponseHandler";
import { AuthenticatedRequest } from "../middlewares/auth";
import { UserRepository } from "../repositories/userRepository";

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const user = await UserRepository.findByIdWithoutPassword(req.userId);

    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    return ResponseHandler.success(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          monthlyIncome: user.monthlyIncome ?? 0,
          financialDayStart: user.financialDayStart ?? 1,
          financialDayEnd: user.financialDayEnd ?? 31,
          firstAccess: user.firstAccess,
          createdAt: user.createdAt,
        },
      },
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
    if (!req.userId) {
      return ResponseHandler.unauthorized(res, "Usuário não autenticado");
    }

    const { monthlyIncome } = req.body;

    const user = await UserRepository.updateMonthlyIncome(
      req.userId,
      monthlyIncome
    );

    if (!user) {
      return ResponseHandler.notFound(res, "Usuário não encontrado");
    }

    return ResponseHandler.success(
      res,
      {
        monthlyIncome,
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
