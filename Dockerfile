# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts ./
COPY web ./web
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8787 \
    TIRED_DATA_DIR=/data
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server ./server
COPY --from=build /app/web/dist ./web/dist
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 8787
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/events').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
