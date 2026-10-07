// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { buildOpenApiDocument } from "./document";

const ROOT = process.cwd();
const document = buildOpenApiDocument();

function collectRefs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, out));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") out.push(value);
      else collectRefs(value, out);
    }
  }
  return out;
}

describe("contrato OpenAPI", () => {
  it("docs/openapi.yaml está em sincronia com os contratos (rode `npm run openapi` se falhar)", () => {
    const committed = parse(readFileSync(join(ROOT, "docs", "openapi.yaml"), "utf8"));
    expect(committed).toEqual(JSON.parse(JSON.stringify(document)));
  });

  it("toda referência aponta para um schema existente", () => {
    const refs = new Set(collectRefs(document));
    expect(refs.size).toBeGreaterThan(20);
    for (const ref of refs) {
      const name = ref.replace("#/components/schemas/", "");
      expect(document.components.schemas, ref).toHaveProperty(name);
    }
  });

  it("documenta exatamente as rotas e métodos implementados em src/app/api/v1", () => {
    const apiDir = join(ROOT, "src", "app", "api", "v1");
    const implemented: string[] = [];
    for (const file of readdirSync(apiDir, { recursive: true }) as string[]) {
      if (!file.endsWith(`route.ts`)) continue;
      const route = `/${file.split(sep).slice(0, -1).join("/")}`.replace(/\[(\w+)\]/g, "{$1}");
      const source = readFileSync(join(apiDir, file), "utf8");
      for (const [, method] of source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)) {
        implemented.push(`${method.toLowerCase()} ${route}`);
      }
    }
    const documented = Object.entries(document.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method} ${path}`),
    );
    expect(documented.sort()).toEqual(implemented.sort());
  });

  it("toda operação declara resposta de sucesso e usa ApiError nos erros", () => {
    for (const methods of Object.values(document.paths)) {
      for (const op of Object.values(methods) as Array<{
        responses: Record<string, { content: unknown }>;
      }>) {
        const statuses = Object.keys(op.responses).map(Number);
        expect(statuses.some((s) => s < 300)).toBe(true);
        for (const status of statuses.filter((s) => s >= 400)) {
          expect(JSON.stringify(op.responses[status].content)).toContain("ApiError");
        }
      }
    }
  });
});
