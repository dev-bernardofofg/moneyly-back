import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { writeFileSync } from "fs";
import { join } from "path";
import { registry } from "./registry";
import "./paths"; // side-effect: registra todos os endpoints

export function generateOpenApiDocument(): ReturnType<
  OpenApiGeneratorV3["generateDocument"]
> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Moneyly API",
      version: "1.0.0",
      description:
        "ARQUIVO GERADO por `pnpm openapi:gen` (zod-to-openapi). NÃO editar à mão. Ver moneyly/.specs/01-api-contract.md",
    },
    servers: [
      { url: "http://localhost:5000", description: "Local" },
      { url: "/", description: "Relativo (deploy)" },
    ],
  });
}

// Execução direta (tsx src/openapi/generate.ts) → escreve openapi.json na raiz do back
const OUTPUT = join(__dirname, "../../openapi.json");

function main() {
  const doc = generateOpenApiDocument();
  writeFileSync(OUTPUT, JSON.stringify(doc, null, 2) + "\n", "utf-8");
  const pathCount = Object.keys(doc.paths ?? {}).length;
  // eslint-disable-next-line no-console
  console.log(`openapi.json gerado: ${pathCount} paths → ${OUTPUT}`);
}

if (require.main === module) {
  main();
}
