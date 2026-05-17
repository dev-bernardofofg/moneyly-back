import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { generateOpenApiDocument } from "../../../src/openapi/generate";

const doc = generateOpenApiDocument();

// Prefixo de montagem de cada router (ver src/routes.ts)
const ROUTER_PREFIX: Record<string, string> = {
  "auth.router.ts": "/auth",
  "user.router.ts": "/user",
  "transaction.router.ts": "/transactions",
  "category.router.ts": "/categories",
  "budget.router.ts": "/budgets",
  "goal.router.ts": "/goals",
  "overview.router.ts": "/overview",
  "recurring-transaction.router.ts": "/recurring-transactions",
};

const ROUTES_DIR = join(__dirname, "../../../src/routes");

function toOpenApiPath(prefix: string, sub: string): string {
  const joined = sub === "/" ? `${prefix}/` : `${prefix}${sub}`;
  return joined.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

// Varre os routers e extrai (method, path) reais declarados no Express
function scanRouters(): Array<{ method: string; path: string; file: string }> {
  const out: Array<{ method: string; path: string; file: string }> = [];
  const re =
    /\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;
  for (const file of readdirSync(ROUTES_DIR)) {
    const prefix = ROUTER_PREFIX[file];
    if (!prefix) continue;
    const src = readFileSync(join(ROUTES_DIR, file), "utf-8");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const method = m[1];
      const sub = m[2];
      if (!method || !sub) continue;
      out.push({
        method: method.toLowerCase(),
        path: toOpenApiPath(prefix, sub),
        file,
      });
    }
  }
  return out;
}

describe("openapi generator", () => {
  it("gera documento OpenAPI 3.0 válido", () => {
    expect(doc.openapi).toBe("3.0.0");
    expect(Object.keys(doc.paths ?? {}).length).toBeGreaterThan(30);
  });

  it("expõe endpoints que estavam ausentes no openapi.json podre (R2/R4/R5)", () => {
    expect(doc.paths?.["/transactions/export"]?.get).toBeDefined();
    expect(doc.paths?.["/overview/insights"]?.get).toBeDefined();
    expect(doc.paths?.["/transactions/summary-by-month"]?.get).toBeDefined();
  });

  it("rotas públicas não exigem auth; rotas privadas exigem bearer", () => {
    expect(doc.paths?.["/auth/sign-up"]?.post?.security).toEqual([]);
    expect(doc.paths?.["/overview/insights"]?.get?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(doc.components?.securitySchemes?.bearerAuth).toBeDefined();
  });

  it("components.schemas povoado com entidades nomeadas (I1 parte-2)", () => {
    const schemas = doc.components?.schemas ?? {};
    expect(Object.keys(schemas).length).toBeGreaterThanOrEqual(15);
    for (const name of [
      "Transaction",
      "User",
      "Goal",
      "Budget",
      "RecurringTransaction",
      "FinancialInsights",
      "DashboardOverview",
    ]) {
      expect(schemas[name]).toBeDefined();
    }
  });

  it("data referencia $ref (não mais {} genérico)", () => {
    const d = doc as unknown as Record<string, any>;
    const dataSchema =
      d.paths["/overview/insights"].get.responses["200"].content[
        "application/json"
      ].schema.properties.data;
    expect(dataSchema.$ref).toBe("#/components/schemas/FinancialInsights");
  });

  it("query page/limit tipados como integer no contrato", () => {
    const d = doc as unknown as Record<string, any>;
    const params = d.paths["/transactions/"].get.parameters ?? [];
    const page = params.find((p: { name: string }) => p.name === "page");
    expect(page?.schema?.type).toBe("integer");
  });

  it("regressão router↔openapi: todo endpoint declarado nos routers está no doc", () => {
    const missing = scanRouters().filter(
      (r) => !(doc.paths as Record<string, Record<string, unknown>>)?.[r.path]?.[
        r.method
      ]
    );
    expect(missing).toEqual([]);
  });
});
