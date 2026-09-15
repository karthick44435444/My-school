# Multi-stage Dockerfile for My School
FROM node:20-alpine AS base

# Install OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy root and package manifests
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy full source
COPY packages ./packages
COPY apps/web ./apps/web
COPY scripts ./scripts

# Generate Prisma Client
RUN npx prisma generate --schema=packages/database/schema.prisma

# Builder stage
FROM base AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build --workspace=apps/web

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl curl

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime dependencies and build artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/package*.json ./apps/web/
COPY --from=builder /app/apps/web/server.js ./apps/web/server.js
COPY --from=builder /app/apps/web/lib ./apps/web/lib
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/scripts ./scripts

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/auth/me || exit 0

CMD ["npm", "run", "start", "--workspace=apps/web"]
