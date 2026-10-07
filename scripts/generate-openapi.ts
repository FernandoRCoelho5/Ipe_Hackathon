/**
 * Gera docs/openapi.yaml a partir dos contratos Zod. Uso: `npm run openapi`.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { buildOpenApiDocument } from "@/server/openapi/document";

const HEADER =
  "# Gerado por `npm run openapi` a partir de src/lib/api/contracts.ts — não edite à mão.\n";

const document = buildOpenApiDocument();
const target = join(process.cwd(), "docs", "openapi.yaml");
writeFileSync(
  target,
  HEADER + stringify(document, { lineWidth: 0, aliasDuplicateObjects: false }),
  "utf8",
);

const operations = Object.values(document.paths).reduce(
  (n, methods) => n + Object.keys(methods).length,
  0,
);
process.stdout.write(
  `OpenAPI 3.1 gerado: ${operations} operações, ${Object.keys(document.components.schemas).length} schemas → docs/openapi.yaml\n`,
);
