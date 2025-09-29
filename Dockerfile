FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src/ src/
RUN npm run build

FROM node:20-alpine AS runtime
RUN apk add --no-cache python3 py3-pip
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/build ./build
ENV NODE_ENV=production
RUN pip install --break-system-packages mcpo
EXPOSE 3000
CMD ["mcpo", "--host", "0.0.0.0", "--port", "3000", "--", "node", "build/index.js"]
