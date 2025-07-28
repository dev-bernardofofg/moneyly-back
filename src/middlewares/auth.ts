import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { ResponseHandler } from "../helpers/response-handler";
import { validateUserNotAuthenticated } from "../validations/user.validation";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any; // Adicionando o usuário completo
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return ResponseHandler.unauthorized(res, "Token não fornecido");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;

    const user = await validateUserNotAuthenticated(decoded.userId);
    req.user = user;

    next();
  } catch (error: any) {
    // Handle JWT specific errors
    if (error.name === "JsonWebTokenError") {
      return ResponseHandler.unauthorized(res, "Token inválido");
    }

    if (error.name === "TokenExpiredError") {
      return ResponseHandler.unauthorized(res, "Token expirado");
    }

    // Pass other errors to the error handler
    next(error);
  }
};
