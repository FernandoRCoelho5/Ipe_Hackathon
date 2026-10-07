# syntax=docker/dockerfile:1.7
# Ipê · imagem de produção (Next.js standalone, usuário sem privilégios).

FROM node:24-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S ipe && adduser -S ipe -G ipe
COPY --from=build --chown=ipe:ipe /app/.next/standalone ./
COPY --from=build --chown=ipe:ipe /app/.next/static ./.next/static
COPY --from=build --chown=ipe:ipe /app/public ./public
USER ipe
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
