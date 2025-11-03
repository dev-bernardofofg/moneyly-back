import { Response } from "express";

/**
 * Normaliza valores decimais do banco (remove .00 desnecessário)
 */
export const normalizeDecimal = (value: string | number | null): string => {
  if (value === null || value === undefined) return "0";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  // Se for número inteiro, retorna sem decimais
  if (Number.isInteger(numValue)) {
    return numValue.toString();
  }
  // Se tiver decimais, remove zeros desnecessários no final
  const fixed = numValue.toFixed(2);
  // Remove .00 ou converte .50 para .5
  return fixed.replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
};

/**
 * Normaliza decimais em objetos recursivamente
 */
export const normalizeDecimals = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeDecimals(item));
  }

  if (typeof obj === "object" && !(obj instanceof Date)) {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Normalizar campos de valores monetários
      if (typeof value === "string" && /^-?\d+\.\d{2}$/.test(value)) {
        normalized[key] = normalizeDecimal(value);
      } else {
        normalized[key] = normalizeDecimals(value);
      }
    }
    return normalized;
  }

  return obj;
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
export interface SuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export class ResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
  ): Response<SuccessResponse<T>> {
    // Normalizar decimais nos dados antes de retornar
    const normalizedData = normalizeDecimals(data) as T;

    const response: SuccessResponse<T> = {
      data: normalizedData,
      ...(message ? { message } : {}),
    };

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    error: string,
    details?: unknown,
    statusCode = 400
  ): Response<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      error,
      ...(details ? { details } : {}),
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    // success já normaliza os decimais
    return this.success(res, data, message, 201);
  }

  static notFound(res: Response, message = "Recurso não encontrado"): Response {
    return this.error(res, message, undefined, 404);
  }

  static unauthorized(res: Response, message = "Não autorizado"): Response {
    return this.error(res, message, undefined, 401);
  }

  static forbidden(res: Response, message = "Acesso negado"): Response {
    return this.error(res, message, undefined, 403);
  }

  static badRequest(res: Response, message = "Requisição inválida"): Response {
    return this.error(res, message, undefined, 400);
  }

  static serverError(
    res: Response,
    message = "Erro interno do servidor"
  ): Response {
    return this.error(res, message, undefined, 500);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext?: boolean;
      hasPrev?: boolean;
    },
    message?: string
  ): Response<PaginatedResponse<T>> {
    // Normalizar decimais nos dados antes de retornar
    const normalizedData = normalizeDecimals(data) as T[];

    const response: PaginatedResponse<T> = {
      success: true,
      data: normalizedData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        hasNext: pagination.hasNext ?? pagination.page < pagination.totalPages,
        hasPrev: pagination.hasPrev ?? pagination.page > 1,
      },
      ...(message ? { message } : {}),
    };

    return res.status(200).json(response);
  }
}
