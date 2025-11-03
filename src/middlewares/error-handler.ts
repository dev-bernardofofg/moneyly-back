import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ResponseHandler } from "../helpers/response-handler";
import { logger } from "../lib/logger";
interface ErrorWithCode extends Error {
  code?: string;
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithCode,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error("Error Handler", error, {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Custom errors with status code (HttpError, etc) - VERIFICAR PRIMEIRO!
  if (error.statusCode || (error as any).status) {
    const statusCode = error.statusCode || (error as any).status;
    const details = (error as any).details;
    ResponseHandler.error(res, error.message, details, statusCode);
    return;
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    // Se o erro é de UUID inválido em um parâmetro de rota (id), retornar 404
    const hasInvalidUuidParam = error.errors.some(
      (err) =>
        err.code === "invalid_string" &&
        err.validation === "uuid" &&
        err.path.includes("id")
    );

    if (hasInvalidUuidParam) {
      ResponseHandler.notFound(res, "Recurso não encontrado");
      return;
    }

    ResponseHandler.error(res, "Dados de validação inválidos", details, 400);
    return;
  }

  // Database constraint errors (Drizzle/PostgreSQL)
  if (error.code === "23503") {
    // Foreign key constraint violation
    ResponseHandler.error(
      res,
      "Referência inválida - verifique se a categoria existe",
      undefined,
      400
    );
    return;
  }

  if (error.code === "23505") {
    // Unique constraint violation
    ResponseHandler.error(res, "Dados duplicados", undefined, 409);
    return;
  }

  if (error.code === "23514") {
    // Check constraint violation
    ResponseHandler.error(res, "Dados inválidos", undefined, 400);
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

  // Default server error
  ResponseHandler.serverError(res);
};
