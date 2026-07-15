import { toSaoPauloTimezone } from '../../../core/helpers/dates';
import { transactionRepository } from '../../../repositories/transaction.repository';
import { financialPeriodService } from '../../financial-period';
import { HttpError } from '../../../validations/errors';
import { calcHours } from '../helpers/calc-hours';
import { overtimeRepository } from '../repositories/overtime.repository';
import { validateActiveCompany } from '../validations/company.validation';
import { validateOvertimeOwnership, validateTimeRange } from '../validations/overtime.validation';
import type { UpdateOvertimeInput } from '../schemas/overtime.schema';

export const updateOvertimeUseCase = async (
  id: string,
  userId: string,
  data: UpdateOvertimeInput
) => {
  const existing = await validateOvertimeOwnership(id, userId);

  const needsRecalc =
    data.companyId !== undefined || data.startTime !== undefined || data.endTime !== undefined;

  let company = existing.company;
  let startTime = existing.startTime;
  let endTime = existing.endTime;

  if (data.companyId && data.companyId !== existing.companyId) {
    const newCompany = await validateActiveCompany(data.companyId, userId);
    company = { id: newCompany.id, name: newCompany.name };
  }
  if (data.startTime) startTime = new Date(data.startTime);
  if (data.endTime) endTime = new Date(data.endTime);

  if (needsRecalc) validateTimeRange(startTime, endTime);

  const updatePayload: Parameters<typeof overtimeRepository.update>[2] = {
    ...(data.description !== undefined && { description: data.description }),
    ...(data.companyId !== undefined && { companyId: data.companyId }),
  };

  let transactionUpdate: Record<string, unknown> = {};

  if (needsRecalc) {
    const hoursWorked = calcHours(startTime, endTime);
    const companyFull = await validateActiveCompany(company.id, userId);
    const hourlyRateSnapshot = Number(companyFull.hourlyRate);
    const amount = hoursWorked * hourlyRateSnapshot;
    const startTimeSP = toSaoPauloTimezone(startTime);
    const month = startTimeSP.getMonth() + 1;
    const year = startTimeSP.getFullYear();
    const periodId = await financialPeriodService.findOrCreatePeriodForDate(userId, startTime);

    Object.assign(updatePayload, {
      startTime,
      endTime,
      hoursWorked: hoursWorked.toString(),
      hourlyRateSnapshot: hourlyRateSnapshot.toString(),
      amount: amount.toString(),
      month,
      year,
    });

    transactionUpdate = {
      amount: amount.toString(),
      date: startTime,
      periodId,
      title: `Hora extra — ${company.name}`,
    };
  }

  if (data.description !== undefined) {
    transactionUpdate.description = data.description;
  }

  const updated = await overtimeRepository.update(id, userId, updatePayload);
  if (!updated) throw new HttpError(404, 'Registro de hora extra não encontrado');

  if (existing.transactionId && Object.keys(transactionUpdate).length > 0) {
    await transactionRepository.update(
      existing.transactionId,
      userId,
      transactionUpdate as Parameters<typeof transactionRepository.update>[2]
    );
  }

  return updated;
};
