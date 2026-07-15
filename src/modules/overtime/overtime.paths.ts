/**
 * Registro OpenAPI do módulo overtime — companies + overtime records
 * (importado por core/openapi/generate).
 */
import { z } from '../../core/openapi/registry';
import { wrapPaginated, wrapSuccess } from '../../core/openapi/envelopes';
import {
  CompanySchema,
  OvertimeRecordSchema,
  OvertimeSummarySchema,
} from '../../core/openapi/schemas';
import { nullData, ok, route } from '../../core/openapi/route';
import { idParamSchema } from '../../core/schemas/id-param.schema';
import { createCompanySchema, updateCompanySchema } from './schemas/company.schema';
import {
  createOvertimeSchema,
  updateOvertimeSchema,
  overtimeExportQuerySchema,
  overtimeListQuerySchema,
  overtimeSummaryQuerySchema,
} from './schemas/overtime.schema';

/* ───────────────────────── companies ───────────────────────── */
route({
  method: 'post',
  path: '/companies/',
  tag: 'Companies',
  summary: 'Criar empresa',
  body: createCompanySchema,
  ok: ok(wrapSuccess(CompanySchema)),
});
route({
  method: 'get',
  path: '/companies/',
  tag: 'Companies',
  summary: 'Listar empresas ativas',
  ok: ok(wrapSuccess(z.array(CompanySchema))),
});
route({
  method: 'put',
  path: '/companies/{id}',
  tag: 'Companies',
  summary: 'Atualizar empresa',
  params: idParamSchema,
  body: updateCompanySchema,
  ok: ok(wrapSuccess(CompanySchema)),
});
route({
  method: 'delete',
  path: '/companies/{id}',
  tag: 'Companies',
  summary: 'Desativar empresa (soft-delete)',
  params: idParamSchema,
  ok: ok(nullData),
});

/* ───────────────────────── overtime ───────────────────────── */
route({
  method: 'post',
  path: '/overtime/',
  tag: 'Overtime',
  summary: 'Criar registro de hora extra',
  body: createOvertimeSchema,
  ok: ok(wrapSuccess(OvertimeRecordSchema)),
});
route({
  method: 'get',
  path: '/overtime/',
  tag: 'Overtime',
  summary: 'Listar paginado (filtros: month, year, companyId; params page, limit)',
  query: overtimeListQuerySchema,
  ok: ok(wrapPaginated(OvertimeRecordSchema)),
});
route({
  method: 'get',
  path: '/overtime/summary',
  tag: 'Overtime',
  summary: 'Resumo de horas extras por mês civil',
  query: overtimeSummaryQuerySchema,
  ok: ok(wrapSuccess(OvertimeSummarySchema)),
});
route({
  method: 'get',
  path: '/overtime/export',
  tag: 'Overtime',
  summary: 'Exportar horas extras em CSV',
  query: overtimeExportQuerySchema,
  csv: true,
});
route({
  method: 'put',
  path: '/overtime/{id}',
  tag: 'Overtime',
  summary: 'Editar registro de hora extra',
  params: idParamSchema,
  body: updateOvertimeSchema,
  ok: ok(wrapSuccess(OvertimeRecordSchema)),
});
route({
  method: 'delete',
  path: '/overtime/{id}',
  tag: 'Overtime',
  summary: 'Deletar registro e transaction vinculada',
  params: idParamSchema,
  ok: ok(nullData),
});
