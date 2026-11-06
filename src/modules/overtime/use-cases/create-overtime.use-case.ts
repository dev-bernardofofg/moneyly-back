import { toSaoPauloTimezone } from '@core/helpers/dates';
import { calcHours } from '../helpers/calc-hours';
import { overtimeRepository } from '../repositories/overtime.repository';
import { validateActiveCompany } from '../validations/company.validation';
import { validateTimeRange } from '../validations/overtime.validation';
import type { CreateOvertimeInput } from '../schemas/overtime.schema';

export const createOvertimeUseCase = async (userId: string, data: CreateOvertimeInput) => {
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  validateTimeRange(startTime, endTime);

  const company = await validateActiveCompany(data.companyId, userId);

  const hoursWorked = calcHours(startTime, endTime);
  const hourlyRateSnapshot = Number(company.hourlyRate);
  const amount = Math.round(hoursWorked * hourlyRateSnapshot);
  const startTimeSP = toSaoPauloTimezone(startTime);
  const month = startTimeSP.getMonth() + 1;
  const year = startTimeSP.getFullYear();

  return overtimeRepository.create({
    userId,
    companyId: company.id,
    description: data.description || null,
    startTime,
    endTime,
    hoursWorked: hoursWorked.toString(),
    hourlyRateSnapshot,
    amount,
    month,
    year,
    transactionId: null,
  });
};
