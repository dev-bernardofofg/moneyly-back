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

export class ResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
    };

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    error: string,
    details?: any,
    statusCode: number = 400
  ): Response {
    const response: ApiResponse = {
      success: false,
      error,
      ...(details && { details }),
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return this.success(res, data, message, 201);
  }

  static notFound(
    res: Response,
    message: string = "Recurso não encontrado"
  ): Response {
    return this.error(res, message, undefined, 404);
  }

  static unauthorized(
    res: Response,
    message: string = "Não autorizado"
  ): Response {
    return this.error(res, message, undefined, 401);
  }

  static forbidden(res: Response, message: string = "Acesso negado"): Response {
    return this.error(res, message, undefined, 403);
  }

  static validationError(
    res: Response,
    details: any,
    message: string = "Erro de validação"
  ): Response {
    return this.error(res, message, details, 400);
  }

  static serverError(
    res: Response,
    message: string = "Erro interno do servidor"
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
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination,
      ...(message && { message }),
    };

    return res.status(200).json(response);
  }
}
