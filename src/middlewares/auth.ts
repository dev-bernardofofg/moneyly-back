import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { ResponseHandler } from "../helpers/response-handler";
import type { AuthenticatedUser, JWTPayload } from "../types/auth.types";
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
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
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
        ResponseHandler.unauthorized(res, "Token expirado");
        return;
      }
    }

    // Pass other errors to the error handler
    next(error);
  }
};
