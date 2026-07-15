/**
 * Helper de registro de endpoint no OpenAPI. Extraído de paths.ts para que
 * cada módulo registre suas rotas em <modulo>/<x>.paths.ts (ver .specs/06).
 */
import { registry, z } from './registry';
import { errorResponse, wrapSuccess } from './envelopes';

export const json = (schema: z.ZodTypeAny) => ({
  content: { 'application/json': { schema } },
});

export type RouteOpts = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  tag: string;
  summary: string;
  auth?: boolean; // default true
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.AnyZodObject;
  ok?: { status: 200 | 201; schema: z.ZodTypeAny };
  csv?: boolean;
};

export function route(o: RouteOpts) {
  const auth = o.auth !== false;
  const ok = o.ok ?? { status: 200 as const, schema: wrapSuccess() };

  const responses: Record<string, unknown> = {
    [ok.status]: {
      description: 'Sucesso',
      ...(o.csv ? { content: { 'text/csv': { schema: z.string() } } } : json(ok.schema)),
    },
    400: { description: 'Requisição inválida', ...json(errorResponse) },
  };
  if (auth) {
    responses[401] = { description: 'Não autenticado', ...json(errorResponse) };
  }
  if (o.params) {
    responses[404] = {
      description: 'Recurso não encontrado',
      ...json(errorResponse),
    };
  }

  registry.registerPath({
    method: o.method,
    path: o.path,
    tags: [o.tag],
    summary: o.summary,
    ...(auth ? { security: [{ bearerAuth: [] }] } : { security: [] }),
    request: {
      ...(o.body ? { body: json(o.body) } : {}),
      ...(o.query ? { query: o.query as z.AnyZodObject } : {}),
      ...(o.params ? { params: o.params } : {}),
    },
    responses: responses as never,
  });
}

export const ok = (schema: z.ZodTypeAny) => ({ status: 200 as const, schema });
export const created = (schema: z.ZodTypeAny = wrapSuccess()) => ({
  status: 201 as const,
  schema,
});
export const nullData = wrapSuccess(z.null());
