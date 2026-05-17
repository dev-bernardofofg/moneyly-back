import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Habilita .openapi() nos schemas Zod. Deve rodar antes de qualquer registro.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Security scheme: JWT Bearer (usado por rotas sob authenticateUser)
export const bearerAuth = registry.registerComponent(
  "securitySchemes",
  "bearerAuth",
  {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  }
);

export { z };
