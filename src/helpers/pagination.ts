export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationQuery {
  offset: number;
  limit: number;
}

export class PaginationHelper {
  static DEFAULT_PAGE = 1;
  static DEFAULT_LIMIT = 10;
  static MAX_LIMIT = 100;

  static validateAndParse(params: PaginationParams): PaginationQuery {
    const page = Math.max(1, Number(params.page) || this.DEFAULT_PAGE);
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, Number(params.limit) || this.DEFAULT_LIMIT)
    );

    return {
      offset: (page - 1) * limit,
      limit,
    };
  }

  static createPaginationResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
