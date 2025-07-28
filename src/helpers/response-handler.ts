import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
export interface SuccessResponse<T> {
  success: true;
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
    const response: SuccessResponse<T> = {
      success: true,
      data,
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
    },
    message?: string
  ): Response<PaginatedResponse<T>> {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination,
      ...(message ? { message } : {}),
    };

    return res.status(200).json(response);
  }
}
