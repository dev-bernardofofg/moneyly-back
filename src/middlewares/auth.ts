import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../helpers/token";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedUser } from "../types/auth.types";
import { validateUserNotAuthenticated } from "../validations/user.validation";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: AuthenticatedUser;
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    ResponseHandler.unauthorized(res, "Token não fornecido");
    return;
  }

  try {
    // Verificar access token usando a função helper atualizada
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;

    const user = await validateUserNotAuthenticated(decoded.userId);
    req.user = user;

    next();
  } catch (error: unknown) {
    // Handle JWT specific errors
    if (error instanceof Error) {
      if (error.name === "JsonWebTokenError") {
        ResponseHandler.unauthorized(res, "Token inválido");
        return;
      }

      if (error.name === "TokenExpiredError") {
        ResponseHandler.unauthorized(res, "Token expirado. Use o refresh token para renovar.");
        return;
      }
    }

    // Pass other errors to the error handler
    next(error);
  }
};
