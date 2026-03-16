FROM node:22-alpine AS builder
WORKDIR /app
COPY typescript/package*.json ./
RUN npm ci
COPY typescript/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build/index.js ./build/index.js
COPY --from=builder /app/package.json ./
RUN npm ci --omit=dev
ENTRYPOINT ["node", "build/index.js"]
