import { categoryRepository } from '../repositories/categories.repository';
import { overtimeRepository } from '../repositories/overtime.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { HttpError } from '../validations/errors';
import { validateActiveCompany } from '../validations/company.validation';
import { validateOvertimeOwnership, validateTimeRange } from '../validations/overtime.validation';
import { financialPeriodService } from './financial-period.service';
import { toSaoPauloTimezone } from '../helpers/dates';
import type { CreateOvertimeInput, UpdateOvertimeInput } from '../schemas/overtime.schema';

async function resolveCategory(categoryId: string | undefined, userId: string): Promise<string> {
  if (categoryId) {
    const cat = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!cat) throw new HttpError(404, 'Categoria não encontrada');
    return cat.id;
  }
  const globals = await categoryRepository.findGlobalCategories();
  const salario = globals.find((c) => c.name === 'Salário');
  if (!salario) throw new HttpError(500, 'Categoria padrão não encontrada');
  return salario.id;
}

function calcHours(startTime: Date, endTime: Date): number {
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
}

export const createOvertimeService = async (userId: string, data: CreateOvertimeInput) => {
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

export const getOvertimeService = async (
  userId: string,
  filters?: { month?: number; year?: number; companyId?: string }
) => {
  return overtimeRepository.findByUserId(userId, filters);
};

export const getOvertimeSummaryService = async (userId: string, month: number, year: number) => {
  return overtimeRepository.getSummary(userId, month, year);
};

export const updateOvertimeService = async (
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

export const deleteOvertimeService = async (id: string, userId: string) => {
  const existing = await validateOvertimeOwnership(id, userId);

  if (existing.transactionId) {
    await transactionRepository.delete(existing.transactionId, userId);
  }

  const deleted = await overtimeRepository.delete(id, userId);
  if (!deleted) throw new HttpError(404, 'Registro de hora extra não encontrado');
  return deleted;
};
