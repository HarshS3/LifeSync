# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/client

# Copy client package manifests
COPY client/package.json client/package-lock.json* ./

# Install client dependencies standalone (skip workspaces — avoids symlink issues in Docker)
RUN npm install --legacy-peer-deps

# Copy client source
COPY client/ ./

# The vite.config.js resolves react from the workspace root via aliases;
# we override those aliases here via environment so Vite finds them locally.
# Build arg lets docker-compose inject the real backend URL at build time.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Production stage (Nginx) ──────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy our custom Nginx config
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
