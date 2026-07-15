import { toSaoPauloTimezone } from '../../../core/helpers/dates';
import { transactionRepository } from '../../../repositories/transaction.repository';
import { financialPeriodService } from '../../../services/financial-period.service';
import { calcHours } from '../helpers/calc-hours';
import { overtimeRepository } from '../repositories/overtime.repository';
import { resolveCategory } from '../services/resolve-category';
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
  const amount = hoursWorked * hourlyRateSnapshot;
  const startTimeSP = toSaoPauloTimezone(startTime);
  const month = startTimeSP.getMonth() + 1;
  const year = startTimeSP.getFullYear();
  const categoryId = await resolveCategory(data.categoryId, userId);

  const periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, startTime);

  const record = await overtimeRepository.create({
    userId,
    companyId: company.id,
    description: data.description ?? null,
    startTime,
    endTime,
    hoursWorked: hoursWorked.toString(),
    hourlyRateSnapshot: hourlyRateSnapshot.toString(),
    amount: amount.toString(),
    month,
    year,
    transactionId: null,
  });

  const transaction = await transactionRepository.create({
    userId,
    type: 'income',
    title: `Hora extra — ${company.name}`,
    amount: amount.toString(),
    categoryId,
    description: data.description ?? null,
    date: startTime,
    periodId,
    recurringTransactionId: null,
    overtimeRecordId: record.id,
  });

  await overtimeRepository.setTransactionId(record.id, transaction.id);

  return { ...record, transactionId: transaction.id };
};
