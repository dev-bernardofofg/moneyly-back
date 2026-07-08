import { categoryRepository } from '../repositories/categories.repository';
import { overtimeRepository } from '../repositories/overtime.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import type { ICategoryRepository } from '../repositories/interfaces/ICategoryRepository';
import type { IOvertimeRepository } from '../repositories/interfaces/IOvertimeRepository';
import type { ITransactionRepository } from '../repositories/interfaces/ITransactionRepository';
import { InternalServerError, NotFoundError } from './errors';
import { validateActiveCompany } from '../validations/company.validation';
import { validateOvertimeOwnership, validateTimeRange } from '../validations/overtime.validation';
import { financialPeriodService } from './financial-period.service';
import { toSaoPauloTimezone } from '../helpers/dates';
import { PaginationHelper, type PaginationParams } from '../helpers/pagination';
import type { CreateOvertimeInput, UpdateOvertimeInput } from '../schemas/overtime.schema';

export interface OvertimeServiceDeps {
  overtimeRepository: IOvertimeRepository;
  categoryRepository: Pick<ICategoryRepository, 'findByIdAndUserId' | 'findGlobalCategories'>;
  transactionRepository: Pick<ITransactionRepository, 'create' | 'update' | 'delete'>;
  financialPeriodService: Pick<typeof financialPeriodService, 'findOrCreatePeriodForDate'>;
  validations: {
    validateActiveCompany: typeof validateActiveCompany;
    validateOvertimeOwnership: typeof validateOvertimeOwnership;
    validateTimeRange: typeof validateTimeRange;
  };
}

function calcHours(startTime: Date, endTime: Date): number {
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
}

export const makeOvertimeService = (deps: OvertimeServiceDeps) => {
  const {
    overtimeRepository,
    categoryRepository,
    transactionRepository,
    financialPeriodService,
    validations,
  } = deps;

  const resolveCategory = async (
    categoryId: string | undefined,
    userId: string
  ): Promise<string> => {
    if (categoryId) {
      const cat = await categoryRepository.findByIdAndUserId(categoryId, userId);
      if (!cat) throw new NotFoundError('Categoria não encontrada');
      return cat.id;
    }
    const globals = await categoryRepository.findGlobalCategories();
    const salario = globals.find((c) => c.name === 'Salário');
    if (!salario) throw new InternalServerError('Categoria padrão não encontrada');
    return salario.id;
  };

  const create = async (userId: string, data: CreateOvertimeInput) => {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    validations.validateTimeRange(startTime, endTime);

    const company = await validations.validateActiveCompany(data.companyId, userId);

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

  const getPaginated = async (
    userId: string,
    filters: { month?: number; year?: number; companyId?: string } & PaginationParams
  ) => {
    const { page, limit, ...rest } = filters;
    const pagination = PaginationHelper.validateAndParse({ page, limit });
    return overtimeRepository.findByUserIdPaginated(userId, rest, pagination);
  };

  const getSummary = async (userId: string, month: number, year: number) => {
    return overtimeRepository.getSummary(userId, month, year);
  };

  const listForExport = async (
    userId: string,
    filters: { month?: number; year?: number; companyId?: string }
  ) => {
    return overtimeRepository.findByUserId(userId, filters);
  };

  const update = async (id: string, userId: string, data: UpdateOvertimeInput) => {
    const existing = await validations.validateOvertimeOwnership(id, userId);

    const needsRecalc =
      data.companyId !== undefined || data.startTime !== undefined || data.endTime !== undefined;

    let company = existing.company;
    let startTime = existing.startTime;
    let endTime = existing.endTime;

    if (data.companyId && data.companyId !== existing.companyId) {
      const newCompany = await validations.validateActiveCompany(data.companyId, userId);
      company = { id: newCompany.id, name: newCompany.name };
    }
    if (data.startTime) startTime = new Date(data.startTime);
    if (data.endTime) endTime = new Date(data.endTime);

    if (needsRecalc) validations.validateTimeRange(startTime, endTime);

    const updatePayload: Parameters<IOvertimeRepository['update']>[2] = {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.companyId !== undefined && { companyId: data.companyId }),
    };

    let transactionUpdate: Record<string, unknown> = {};

    if (needsRecalc) {
      const hoursWorked = calcHours(startTime, endTime);
      const companyFull = await validations.validateActiveCompany(company.id, userId);
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
    if (!updated) throw new NotFoundError('Registro de hora extra não encontrado');

    if (existing.transactionId && Object.keys(transactionUpdate).length > 0) {
      await transactionRepository.update(
        existing.transactionId,
        userId,
        transactionUpdate as Parameters<ITransactionRepository['update']>[2]
      );
    }

    return updated;
  };

  const remove = async (id: string, userId: string) => {
    const existing = await validations.validateOvertimeOwnership(id, userId);

    if (existing.transactionId) {
      await transactionRepository.delete(existing.transactionId, userId);
    }

    const deleted = await overtimeRepository.delete(id, userId);
    if (!deleted) throw new NotFoundError('Registro de hora extra não encontrado');
    return deleted;
  };

  return { create, getPaginated, getSummary, listForExport, update, delete: remove };
};

// Composition root: instância default com os singletons reais.
export const overtimeService = makeOvertimeService({
  overtimeRepository,
  categoryRepository,
  transactionRepository,
  financialPeriodService,
  validations: {
    validateActiveCompany,
    validateOvertimeOwnership,
    validateTimeRange,
  },
});
