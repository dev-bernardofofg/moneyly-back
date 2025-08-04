import { PaginationHelper } from "../helpers/pagination";

export const validatePagination = async (page?: number, limit?: number) => {
  // Se page ou limit são fornecidos, sempre retornar paginação válida
  if (page !== undefined || limit !== undefined) {
    const paginationParams = {
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    };

    const pagination = PaginationHelper.validateAndParse(paginationParams);
    return pagination;
  }
  return null;
};
