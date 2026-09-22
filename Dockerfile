# ==============================================================================
# Multi-Stage Production Dockerfile for RuangTenang & RuangKerja Platform
# Target Runtime: Node.js 22 Alpine (Lightweight, Non-root, Hardened Security)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets & Bundle Backend Application
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build-time system dependencies
RUN apk add --no-cache libc6-compat openssl

# Install all dependencies (including devDependencies for Vite & TypeScript build)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy application source code & configurations
COPY tsconfig.json vite.config.ts index.html ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY public ./public
COPY src ./src
COPY server ./server
COPY shared ./shared
COPY server.ts ./

# Generate Prisma Client specifically targeting PostgreSQL SSOT schema
RUN npx prisma generate --schema prisma/schema.postgres.prisma

# Build optimized static frontend assets via Vite
RUN npx vite build

# Bundle server-side TypeScript entrypoint into CommonJS production bundle
RUN npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs

# Strip any stray source map files for security and lean bundle size
RUN rm -f dist/*.map dist/assets/*.map

# ------------------------------------------------------------------------------
# Stage 2: Prepare Lean Production Node Modules & Prisma Engine
# ------------------------------------------------------------------------------
FROM node:22-alpine AS deps-prod

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts

# Copy Prisma schema and generate Alpine-compatible production client
COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.postgres.prisma

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runner (Non-Root, Secure, Alpine-Based)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install security and operational runtime tools:
# - dumb-init: handles PID 1 signal forwarding (graceful SIGTERM/SIGINT)
# - openssl: required for Prisma query engine and TLS
# - ca-certificates: trusted CA certificates
# - tzdata: accurate Asia/Jakarta timezone support
# - wget: lightweight container healthcheck probe
RUN apk add --no-cache dumb-init openssl ca-certificates tzdata wget \
    && rm -rf /var/cache/apk/*

# Standard production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Jakarta

# Create application folders and assign ownership to unprivileged 'node' user
RUN mkdir -p /app/dist /app/uploads /app/prisma \
    && chown -R node:node /app

# Copy production node_modules with Prisma runtime engine
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules

# Copy compiled backend bundle and static frontend distribution
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Switch to non-root user (UID 1000)
USER node

# Expose internal service port (only accessible inside Docker bridge/proxy network)
EXPOSE 3000

# Container Healthcheck targeting local API health endpoint
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/v1/health || exit 1

# Utilize dumb-init for proper process lifecycle management
ENTRYPOINT ["dumb-init", "--"]

# Launch production server
CMD ["node", "dist/server.cjs"]
