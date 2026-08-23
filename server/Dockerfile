# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests for dependency install only (better layer caching)
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# non-root user for security
RUN addgroup -S lifesync && adduser -S lifesync -G lifesync

# Copy installed prod dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Drop privileges
USER lifesync

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "index.js"]
