import { PaginationHelper } from "../helpers/pagination";

export const validatePagination = async (page: number, limit: number) => {
  const hasPagination = page || limit;

  if (hasPagination) {
    const paginationParams = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const pagination = PaginationHelper.validateAndParse(paginationParams);
    return pagination;
  }
  return null;
};
