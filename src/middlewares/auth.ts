import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ResponseHandler } from "../lib/ResponseHandler";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const authenticateUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return ResponseHandler.unauthorized(res, "Token não fornecido");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    console.error("Auth error:", error);
    // Let the error handler deal with JWT errors
    next(error);
  }
};
