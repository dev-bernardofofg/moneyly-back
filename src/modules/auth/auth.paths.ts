/**
 * Registro OpenAPI do módulo auth (importado por core/openapi/generate).
 */
import { z } from '@core/openapi/registry';
import { wrapSuccess } from '@core/openapi/envelopes';
import { AuthRefreshSchema, AuthSessionSchema } from '@core/openapi/schemas';
import { created, ok, route } from '@core/openapi/route';
import {
  createUserSchema,
  googleAuthSchema,
  loginSchema,
  refreshTokenSchema,
} from './schemas/auth.schema';

route({
  method: 'post',
  path: '/auth/sign-up',
  tag: 'Auth',
  summary: 'Cadastro de usuário',
  auth: false,
  body: createUserSchema,
  ok: created(wrapSuccess(AuthSessionSchema)),
});
route({
  method: 'post',
  path: '/auth/sign-in',
  tag: 'Auth',
  summary: 'Login',
  auth: false,
  body: loginSchema,
  ok: ok(wrapSuccess(AuthSessionSchema)),
});
route({
  method: 'post',
  path: '/auth/google',
  tag: 'Auth',
  summary: 'Login com Google',
  auth: false,
  body: googleAuthSchema,
  ok: ok(wrapSuccess(AuthSessionSchema)),
});
route({
  method: 'post',
  path: '/auth/refresh',
  tag: 'Auth',
  summary: 'Renovar access token',
  auth: false,
  body: refreshTokenSchema,
  ok: ok(wrapSuccess(AuthRefreshSchema)),
});
route({
  method: 'post',
  path: '/auth/logout',
  tag: 'Auth',
  summary: 'Logout (revoga refresh token)',
  body: refreshTokenSchema,
  ok: ok(wrapSuccess(z.object({ success: z.boolean() }))),
});
