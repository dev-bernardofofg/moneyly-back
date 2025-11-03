import type { NextFunction, Request, Response } from "express";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  createGoogleSessionService,
  createSessionService,
  createUserService,
} from "../services/user.service";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user, accessToken, refreshToken } = await createUserService(
      req.body
    );

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
        accessToken,
        refreshToken,
      },
      "Usuário criado com sucesso"
    );
  } catch (error) {
    // Se for HttpError, repassa para o error handler via next
    if ((error as any).status || (error as any).statusCode) {
      return next(error);
    }

    return ResponseHandler.error(
      res,
      "Não foi possível criar sua conta. Verifique se o email já não está cadastrado e tente novamente.",
      error
    );
  }
};

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user, accessToken, refreshToken } = await createSessionService(
      req.body
    );

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
        accessToken,
        refreshToken,
      },
      "Login realizado com sucesso"
    );
  } catch (error) {
    // Se for HttpError (senha inválida, usuário não encontrado), repassa via next
    if ((error as any).status || (error as any).statusCode) {
      return next(error);
    }

    return ResponseHandler.error(
      res,
      "Não foi possível fazer login. Verifique suas credenciais e tente novamente.",
      error
    );
  }
};

export const createGoogleSession = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  try {
    const { user, accessToken, refreshToken } =
      await createGoogleSessionService(idToken);

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
        accessToken,
        refreshToken,
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

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken: refreshTokenValue } = req.body;

  if (!refreshTokenValue) {
    return ResponseHandler.badRequest(res, "Refresh token não fornecido");
  }

  try {
    const { refreshTokenService } = await import("../services/user.service.js");
    const { user, accessToken } = await refreshTokenService(refreshTokenValue);

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
        accessToken,
      },
      "Token renovado com sucesso"
    );
  } catch (error) {
    return ResponseHandler.unauthorized(
      res,
      "Refresh token inválido ou expirado"
    );
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { user } = req;
  const { refreshToken: refreshTokenValue } = req.body;

  if (!user) {
    return ResponseHandler.unauthorized(res, "Usuário não autenticado");
  }

  if (!refreshTokenValue) {
    return ResponseHandler.badRequest(res, "Refresh token não fornecido");
  }

  try {
    const { revokeRefreshTokenService } = await import(
      "../services/user.service.js"
    );
    await revokeRefreshTokenService(user.id, refreshTokenValue);

    return ResponseHandler.success(
      res,
      { success: true },
      "Logout realizado com sucesso"
    );
  } catch (error) {
    if ((error as any).status || (error as any).statusCode) {
      return next(error);
    }

    return ResponseHandler.error(res, "Não foi possível fazer logout", error);
  }
};
