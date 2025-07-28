import type { Request, Response } from "express";
import { ResponseHandler } from "../helpers/response-handler";
import {
  createGoogleSessionService,
  createSessionService,
  createUserService,
} from "../services/user.service";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { user, token } = await createUserService(req.body);

    return ResponseHandler.created(
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
        token,
      },
      "Usuário criado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao criar usuário", error);
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { user, token } = await createSessionService(req.body);

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
        token,
      },
      "Login realizado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(res, "Erro ao criar sessão", error);
  }
};

export const createGoogleSession = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  try {
    const { user, token } = await createGoogleSessionService(idToken);

    return ResponseHandler.success(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          googleId: user.googleId,
          avatar: user.avatar,
          monthlyIncome: user.monthlyIncome ?? 0,
          financialDayStart: user.financialDayStart ?? 1,
          financialDayEnd: user.financialDayEnd ?? 31,
          firstAccess: user.firstAccess,
          createdAt: user.createdAt,
        },
        token,
      },
      "Login com Google realizado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.error(
      res,
      "Falha na autenticação com Google",
      undefined,
      401
    );
  }
};
