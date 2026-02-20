# syntax=docker/dockerfile:1

# Combined Frontend Dockerfile
# Builds and serves both admin and core apps
# Routes based on HOST header using a custom server

# Base stage for dependencies
FROM node:22-alpine AS base
RUN corepack enable pnpm

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/admin/package.json ./apps/admin/
COPY apps/core/package.json ./apps/core/

# Copy shared package source (needed for build)
COPY packages/shared/ ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build admin app
FROM base AS builder-admin
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules

# Copy workspace config and source
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/admin/ ./apps/admin/

# Generate Prisma client before building
WORKDIR /app/packages/shared
RUN pnpm db:generate

# Build the admin application
WORKDIR /app/apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* variables must be set at build time as they're inlined into the JS bundle
ARG NEXT_PUBLIC_API_URL=https://api.truestack.my
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm build

# Build core app
FROM base AS builder-core
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/core/node_modules ./apps/core/node_modules

# Copy workspace config and source
COPY pnpm-workspace.yaml package.json ./
COPY apps/core/ ./apps/core/

# Build the core application
WORKDIR /app/apps/core
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Production stage - custom multi-app server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for container health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built admin app standalone
COPY --from=builder-admin --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./admin/
COPY --from=builder-admin --chown=nextjs:nodejs /app/apps/admin/.next/static ./admin/apps/admin/.next/static
COPY --from=builder-admin --chown=nextjs:nodejs /app/apps/admin/public ./admin/apps/admin/public

# Copy built core app standalone
COPY --from=builder-core --chown=nextjs:nodejs /app/apps/core/.next/standalone ./core/
COPY --from=builder-core --chown=nextjs:nodejs /app/apps/core/.next/static ./core/apps/core/.next/static
COPY --from=builder-core --chown=nextjs:nodejs /app/apps/core/public ./core/apps/core/public

# Copy the multi-app server
COPY apps/frontend/server.js ./server.js

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
