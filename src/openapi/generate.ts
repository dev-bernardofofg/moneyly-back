import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { registry } from './registry';
import './paths'; // side-effect: registra todos os endpoints

/**
 * zod-to-openapi v7 emite ref-nullable como `{ allOf: [ {$ref}, {nullable:true} ] }`.
 * Forma OpenAPI 3.0 canônica (e que consumers zod/strict como Kubb aceitam):
 * `{ nullable: true, allOf: [ {$ref} ] }`. Normaliza recursivamente.
 */
function normalizeNullableRefs<T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map((n) => normalizeNullableRefs(n)) as unknown as T;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const allOf = obj.allOf as Array<Record<string, unknown>> | undefined;
    if (
      Array.isArray(allOf) &&
      allOf.some((m) => m && m.nullable === true && Object.keys(m).length === 1) &&
      allOf.some((m) => m && typeof m.$ref === 'string')
    ) {
      const refs = allOf.filter((m) => !(m.nullable === true && Object.keys(m).length === 1));
      const rest: Record<string, unknown> = { ...obj, nullable: true, allOf: refs };
      return normalizeNullableRefs(rest) as T;
    }
    for (const k of Object.keys(obj)) {
      obj[k] = normalizeNullableRefs(obj[k]);
    }
    return obj as T;
  }
  return node;
}

export function generateOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Moneyly API',
      version: '1.0.0',
      description:
        'ARQUIVO GERADO por `pnpm openapi:gen` (zod-to-openapi). NÃO editar à mão. Ver moneyly/.specs/01-api-contract.md',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local' },
      { url: '/', description: 'Relativo (deploy)' },
    ],
  });
  return normalizeNullableRefs(doc);
}

// Execução direta (tsx src/openapi/generate.ts) → escreve openapi.json na raiz do back
const OUTPUT = join(__dirname, '../../openapi.json');

function main() {
  const doc = generateOpenApiDocument();
  writeFileSync(OUTPUT, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  const pathCount = Object.keys(doc.paths ?? {}).length;
  // eslint-disable-next-line no-console
  console.log(`openapi.json gerado: ${pathCount} paths → ${OUTPUT}`);
}

if (require.main === module) {
  main();
}
