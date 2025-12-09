# Grúa RD - Production Dockerfile
# Optimized for CapRover deployment

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept VITE_ environment variables as build arguments
# These must be available at build time for Vite to embed them in the frontend bundle
# IMPORTANT: In CapRover, set these as "App Configs" with "Is Build-Time Variable" enabled

# Mapbox token for maps rendering
ARG VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN

# VAPID public key for web push notifications
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

# API URL for mobile apps (optional for web, required for native builds)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and wget for health checks
RUN apk add --no-cache dumb-init wget

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

# Health check using wget
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
