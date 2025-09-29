FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production=false
COPY src/ src/
RUN npm run build

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S canvas -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/build ./build
COPY --chown=canvas:nodejs . .
USER canvas
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD node -e "import('./build/client.js').then(m => new m.CanvasClient(process.env.CANVAS_API_TOKEN, process.env.CANVAS_DOMAIN).healthCheck()).then(() => process.exit(0)).catch(() => process.exit(1))"
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npx", "-y", "uvx", "mcpo", "--host", "0.0.0.0", "--port", "3000", "--", "node", "build/index.js"]
