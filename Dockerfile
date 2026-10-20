FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Prisma needs a datasource value at generation time; this build-only URL has no credentials.
RUN DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build?schema=public' npx prisma generate --schema prisma/schema.postgres.prisma
RUN npm run build:production

# Kept only for the one-off migration target; the deployed web target is pruned below.
FROM build AS migrator

FROM build AS runtime-deps
RUN npm prune --omit=dev && npm cache clean --force

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache postgresql-client

# Create uploads directory and ensure non-root node user ownership
RUN mkdir -p /app/uploads/attachments /app/backups && chown -R node:node /app

COPY --from=runtime-deps --chown=node:node /app/package.json ./package.json
COPY --from=runtime-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/v1/health || exit 1

CMD ["node", "dist/server.mjs"]
