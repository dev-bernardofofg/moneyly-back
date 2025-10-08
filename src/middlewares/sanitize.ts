import { NextFunction, Request, Response } from "express";

// Função para sanitizar strings
const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/[<>]/g, "") // Remove caracteres que podem causar XSS
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/on\w+=/gi, "") // Remove event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ""); // Remove scripts
};

// Função para sanitizar qualquer valor
const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === "object" && value !== null) {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
};

// Função para sanitizar objeto
const sanitizeObject = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
};

// Middleware de sanitização
export const sanitizeData = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // Sanitizar body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }

  // Sanitizar query parameters
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(
      req.query as Record<string, unknown>
    ) as typeof req.query;
  }

  // Sanitizar params
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(
      req.params as Record<string, unknown>
    ) as typeof req.params;
  }

  next();
};

// Middleware específico para campos sensíveis
export const sanitizeSensitiveFields = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // Remover campos sensíveis dos logs
  const sensitiveFields = ["password", "token", "authorization"];

  if (req.body) {
    sensitiveFields.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = "[REDACTED]";
      }
    });
  }

  next();
};
