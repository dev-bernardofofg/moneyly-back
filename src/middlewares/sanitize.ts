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

// Função para sanitizar objeto
const sanitizeObject = (obj: any): any => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Middleware de sanitização
export const sanitizeData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Sanitizar body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitizar query parameters
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  // Sanitizar params
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Middleware específico para campos sensíveis
export const sanitizeSensitiveFields = (
  req: Request,
  res: Response,
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
