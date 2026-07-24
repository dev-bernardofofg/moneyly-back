import { PaginationHelper, type PaginationParams } from '@core/helpers/pagination';
import { overtimeRepository } from '../repositories/overtime.repository';

export const listOvertimeUseCase = async (
  userId: string,
  filters: { month?: number; year?: number; companyId?: string } & PaginationParams
) => {
  const { page, limit, ...rest } = filters;
  const pagination = PaginationHelper.validateAndParse({ page, limit });
  return overtimeRepository.findByUserIdPaginated(userId, rest, pagination);
};
