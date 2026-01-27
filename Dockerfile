# syntax=docker/dockerfile:1

# Base stage for dependencies
FROM node:22-alpine AS base
RUN corepack enable pnpm

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files, prisma config, and prisma schema (needed for postinstall)
COPY package.json pnpm-lock.yaml ./
COPY prisma.config.mjs ./
COPY prisma/ ./prisma/

# Install dependencies (postinstall runs prisma generate)
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
# Provide dummy secret for build (real secret is provided at runtime)
ENV BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for container health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
