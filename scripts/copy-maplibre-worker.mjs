/**
 * Copia o Web Worker do MapLibre GL para `public/vendor/`.
 *
 * O MapLibre 6 resolve o worker relativo ao próprio módulo (`import.meta.url`), o que
 * deixa de valer depois que o Turbopack empacota o código em chunks. Servimos o arquivo
 * do mesmo domínio (compatível com a CSP `worker-src 'self'`) e o mapa aponta para ele
 * com `setWorkerUrl` (ver src/components/map/thermal-map.tsx).
 * Roda antes de `dev` e `build`; o destino fica fora do Git.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const source = join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs");
const targetDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "vendor");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, "maplibre-gl-worker.mjs"));
console.log(`maplibre-gl ${version}: worker copiado para public/vendor/`);
