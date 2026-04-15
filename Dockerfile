# Zoon 生产镜像（Railway / 自托管通用）
#
# 两阶段构建：
#   1. builder：装完整依赖 + 构建前端产物（dist/）
#   2. runtime：slim 镜像，只留运行时需要的文件
#
# 运行方式：
#   - 读 $PORT、$DATABASE_PATH、$SNAPSHOT_DIR（Railway 自动注入 PORT）
#   - 持久化数据挂到 /data（SQLite + 快照图）
#   - 不用 --env-file，env vars 由平台注入

FROM node:20-bookworm-slim AS builder

# better-sqlite3 需要 node-gyp 编译：python3 + 工具链
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先拷 package.json + lock，利用 Docker layer 缓存
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci

# 源码
COPY tsconfig.json tsconfig.server.json vite.config.ts ./
COPY src ./src
COPY server ./server
COPY scripts ./scripts
COPY public ./public
COPY docs ./docs

# 产出 dist/
RUN npm run build

# --------- runtime ---------
FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# 只装运行时最小 tini 做 PID 1（优雅退出）
RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# 从 builder 拷所有运行时需要的东西
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/server ./server
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/public ./public
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.server.json ./tsconfig.server.json

# 持久化目录（Railway 挂 Volume 到这里）
RUN mkdir -p /data/snapshots
ENV DATABASE_PATH=/data/proof-share.db \
    SNAPSHOT_DIR=/data/snapshots \
    COLLAB_EMBEDDED_WS=1 \
    COLLAB_ON_DEMAND_PROJECTION_REPAIR_ENABLED=1

EXPOSE 4000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--import=tsx/esm", "server/index.ts"]
