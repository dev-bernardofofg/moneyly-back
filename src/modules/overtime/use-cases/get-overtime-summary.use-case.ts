import { overtimeRepository } from '../repositories/overtime.repository';

export const getOvertimeSummaryUseCase = async (userId: string, month: number, year: number) => {
  return overtimeRepository.getSummary(userId, month, year);
};
