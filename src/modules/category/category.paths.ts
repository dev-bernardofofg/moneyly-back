/**
 * Registro OpenAPI do módulo category (importado por core/openapi/generate).
 */
import { z } from '../../core/openapi/registry';
import { wrapPaginated, wrapSuccess } from '../../core/openapi/envelopes';
import { CategorySchema } from '../../core/openapi/schemas';
import { created, nullData, ok, route } from '../../core/openapi/route';
import { idParamSchema } from '../../core/schemas/id-param.schema';
import { createCategorySchema, updateCategorySchema } from './schemas/category.schema';

const intQuery = z.coerce.number().int().positive().optional();
const categoriesQuery = z.object({ page: intQuery, limit: intQuery });

route({
  method: 'post',
  path: '/categories/create',
  tag: 'Categories',
  summary: 'Criar categoria',
  body: createCategorySchema,
  ok: created(wrapSuccess(CategorySchema)),
});
route({
  method: 'get',
  path: '/categories/',
  tag: 'Categories',
  summary: 'Listar categorias paginadas (params: page, limit)',
  query: categoriesQuery,
  ok: ok(wrapPaginated(CategorySchema)),
});
route({
  method: 'put',
  path: '/categories/update/{id}',
  tag: 'Categories',
  summary: 'Atualizar categoria',
  body: updateCategorySchema,
  params: idParamSchema,
  ok: ok(wrapSuccess(CategorySchema)),
});
route({
  method: 'delete',
  path: '/categories/delete/{id}',
  tag: 'Categories',
  summary: 'Deletar categoria',
  params: idParamSchema,
  ok: ok(nullData),
});
