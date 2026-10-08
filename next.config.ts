import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Basemap vetorial Carto (estilo, tiles, sprites e glifos). Ver ADR-002. */
const BASEMAP_ORIGINS = "https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com";

/**
 * Content-Security-Policy.
 * `'unsafe-inline'` em scripts é exigido pelo script de tema (ADR-008) e pelo payload
 * RSC inline do Next.js sem nonce; nonces tornariam todas as páginas dinâmicas e
 * anulariam o Cache Components (ADR-001). Em desenvolvimento, o HMR precisa de
 * `'unsafe-eval'` e de WebSocket.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'wasm-unsafe-eval': motor de layout (yoga, WebAssembly) do gerador de PDF no navegador.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${BASEMAP_ORIGINS}`,
  "font-src 'self' data:",
  // data: o yoga carrega o próprio .wasm embutido como data URL.
  `connect-src 'self' data: ${BASEMAP_ORIGINS}${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** Cabeçalhos de segurança aplicados a todas as rotas. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  /** Imagem Docker enxuta: copia só o necessário para rodar (ver Dockerfile). */
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
