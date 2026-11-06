# Multi-stage Docker build for ROSCOPAL
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server-runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist

# Persistent volume for SQLite database
VOLUME ["/app/data"]

EXPOSE 5000

CMD ["npx", "--prefix", "server", "tsx", "server/src/index.ts"]
