import { format } from 'date-fns';
import { ResponseHandler } from '@core/helpers/response-handler';
import { asyncHandler } from '@core/middlewares/async-handler';
import type { AuthRequest } from '@modules/auth/middlewares/auth';
import { overtimeRepository } from './repositories/overtime.repository';
import { BadRequestError } from '@core/errors';
import { createOvertimeUseCase } from './use-cases/create-overtime.use-case';
import { deleteOvertimeUseCase } from './use-cases/delete-overtime.use-case';
import { getOvertimeSummaryUseCase } from './use-cases/get-overtime-summary.use-case';
import { listOvertimeUseCase } from './use-cases/list-overtime.use-case';
import { updateOvertimeUseCase } from './use-cases/update-overtime.use-case';

export const createOvertime = asyncHandler<AuthRequest>(async (req, res) => {
  const record = await createOvertimeUseCase(req.user.id, req.body);
  return ResponseHandler.created(res, record, 'Registro de hora extra criado com sucesso');
});

export const getOvertime = asyncHandler<AuthRequest>(async (req, res) => {
  const { month, year, companyId, page, limit } = req.query as {
    month?: number;
    year?: number;
    companyId?: string;
    page?: number;
    limit?: number;
  };
  const result = await listOvertimeUseCase(req.user.id, {
    month,
    year,
    companyId,
    page,
    limit,
  });
  return ResponseHandler.paginated(
    res,
    result.data,
    result.pagination,
    'Registros recuperados com sucesso'
  );
});

export const getOvertimeSummary = asyncHandler<AuthRequest>(async (req, res) => {
  const { month, year } = req.query as { month: string; year: string };
  const summary = await getOvertimeSummaryUseCase(req.user.id, Number(month), Number(year));
  return ResponseHandler.success(res, summary, 'Resumo recuperado com sucesso');
});

export const updateOvertime = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do registro não fornecido');

  const record = await updateOvertimeUseCase(id, req.user.id, req.body);
  return ResponseHandler.success(res, record, 'Registro atualizado com sucesso');
});

export const exportOvertimeCsv = asyncHandler<AuthRequest>(async (req, res) => {
  const { month, year, companyId } = req.query as {
    month?: number;
    year?: number;
    companyId?: string;
  };

  const records = await overtimeRepository.findByUserId(req.user.id, { month, year, companyId });

  const headers = ['Empresa', 'Data', 'Início', 'Fim', 'Horas', 'Valor (R$)', 'Descrição'];
  const rows = records.map((r) => [
    r.company.name,
    format(new Date(r.startTime), 'dd/MM/yyyy'),
    format(new Date(r.startTime), 'HH:mm'),
    format(new Date(r.endTime), 'HH:mm'),
    Number(r.hoursWorked).toFixed(2).replace('.', ','),
    Number(r.amount).toFixed(2).replace('.', ','),
    r.description ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const filename = `horas-extras-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
});

export const deleteOvertime = asyncHandler<AuthRequest>(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError('ID do registro não fornecido');

  await deleteOvertimeUseCase(id, req.user.id);
  return ResponseHandler.success(res, null, 'Registro deletado com sucesso');
});
