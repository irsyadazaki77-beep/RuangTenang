FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Prisma needs a datasource value at generation time; this build-only URL has no credentials.
RUN DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build?schema=public' npx prisma generate --schema prisma/schema.postgres.prisma
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/server.mjs"]
