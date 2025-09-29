FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production=false
COPY src/ src/
RUN npm run build

FROM python:3.11-slim AS runtime
RUN apt-get update && apt-get install -y git curl
WORKDIR /app
COPY --from=builder /app ./
ENV NODE_ENV=production
RUN pip install mcpo
# ensure node dependencies are installed
RUN apt-get install -y nodejs npm
RUN npm ci --only=production
EXPOSE 3000
CMD ["mcpo", "--host", "0.0.0.0", "--port", "3000", "--", "node", "build/index.js"]
