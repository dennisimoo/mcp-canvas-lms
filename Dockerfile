FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY src/ src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies (wget for health checks)
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S canvas -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/build ./build
COPY --chown=canvas:nodejs . .

# Switch to non-root user
USER canvas

# Health check - defaults to HTTP mode health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD if [ "$SERVER_MODE" = "http" ]; then \
    wget --no-verbose --tries=1 --spider http://localhost:${HTTP_PORT:-8000}/api/health || exit 1; \
  else \
    node -e "import('./build/client.js').then(m => new m.CanvasClient(process.env.CANVAS_API_TOKEN, process.env.CANVAS_DOMAIN).healthCheck()).then(() => process.exit(0)).catch(() => process.exit(1))"; \
  fi

# Expose ports
EXPOSE 3000 8000

# Set environment
ENV NODE_ENV=production
ENV SERVER_MODE=http
ENV HTTP_PORT=8000

# Command to run the application
# Use environment variables to control mode
CMD if [ "$SERVER_MODE" = "stdio" ]; then \
      node build/index.js; \
    else \
      node build/index.js --mode http --port ${HTTP_PORT}; \
    fi
