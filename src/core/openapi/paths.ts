/**
 * Endpoints legados (layer-first) ainda não migrados para módulos + health.
 * Módulos migrados registram os seus em src/modules/<x>/<x>.paths.ts
 * (importados por ./generate). Ao migrar um módulo, mover a seção daqui.
 */
import { z } from './registry';
import { ok, route } from './route';

/* ───────────────────────── health ───────────────────────── */
route({
  method: 'get',
  path: '/health',
  tag: 'Health',
  summary: 'Healthcheck',
  auth: false,
  ok: ok(
    z.object({
      status: z.string(),
      message: z.string(),
      timestamp: z.string(),
      environment: z.string(),
    })
  ),
});
