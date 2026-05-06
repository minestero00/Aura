FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY back/package*.json back/
COPY front/package*.json front/
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build --workspace back

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY back/package*.json back/
COPY front/package*.json front/
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/back/dist ./back/dist
COPY --from=builder /app/back/db ./back/db
COPY --from=builder /app/back/scripts/migrate.mjs ./back/scripts/migrate.mjs
COPY --from=builder /app/back/scripts/preflight.mjs ./back/scripts/preflight.mjs
COPY --from=builder /app/back/.env.example ./back/.env.example

WORKDIR /app/back
CMD ["sh", "-c", "npm run preflight:prod && npm run migrate:prod && node dist/server.js"]
