import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ResponseHandler } from "../lib/ResponseHandler";

export interface ErrorWithCode extends Error {
  code?: string;
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithCode,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error Handler:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    ResponseHandler.validationError(res, details);
    return;
  }

  // Database constraint errors
  if (error.code === "P2002") {
    ResponseHandler.error(res, "Dados duplicados", { field: "email" }, 409);
    return;
  }

  if (error.code === "P2025") {
    ResponseHandler.notFound(res, "Recurso não encontrado");
    return;
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    ResponseHandler.unauthorized(res, "Token inválido");
    return;
  }

  if (error.name === "TokenExpiredError") {
    ResponseHandler.unauthorized(res, "Token expirado");
    return;
  }

  // Custom errors with status code
  if (error.statusCode) {
    ResponseHandler.error(res, error.message, undefined, error.statusCode);
    return;
  }

  // Default server error
  ResponseHandler.serverError(res);
};
