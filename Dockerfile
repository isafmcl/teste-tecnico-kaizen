FROM node:24-bookworm-slim AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:24-bookworm-slim AS backend

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/ecommerce.db

WORKDIR /app/backend

COPY --from=backend /app/backend/package.json ./package.json
COPY --from=backend /app/backend/node_modules ./node_modules
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY --from=frontend /app/frontend/dist /app/frontend/dist

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3001

CMD ["node", "src/server.js"]
