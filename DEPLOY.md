# 部署 Zoon 到 Railway

本项目用 Dockerfile 部署，SQLite + 本地快照持久化走 Railway Volume。

## 0. 前置

- Railway 账号（https://railway.com）
- 本机装 Railway CLI：`brew install railway`（可选，也可以全 Web 操作）
- 一个域名（可选）：Railway 默认给 `*.up.railway.app`

## 1. 首次部署

1. **创建项目**：Railway Dashboard → New Project → Deploy from GitHub repo → 选这个仓库。
2. **确认 Builder**：Settings → Build → 应自动识别 `railway.toml`（DOCKERFILE）。
3. **挂 Volume**：
   - Project → 你的 service → Settings → Volumes → New Volume
   - Mount path：`/data`
   - Size：建议 1 GB 起步（SQLite + 快照图够用几万文档）
4. **配置环境变量**（Variables 标签）：

   必填：
   ```
   PROOF_SHARE_MARKDOWN_AUTH_MODE=api_key
   PROOF_SHARE_MARKDOWN_API_KEY=<生成一个随机 32 字符，用于 admin 创建文档>
   PROOF_LEGACY_CREATE_MODE=disabled
   PROOF_COLLAB_SIGNING_SECRET=<生成一个随机 32 字符，用于 WebSocket JWT 签名>
   PROOF_PUBLIC_ORIGIN=https://<你的域名或 Railway 域名>
   ZOON_PUBLIC_CREATE_ENABLED=true
   ```

   可选（开启 AI 功能时加）：
   ```
   VITE_ANTHROPIC_API_KEY=sk-or-v1-...
   VITE_ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1
   VITE_ANTHROPIC_MODEL=anthropic/claude-opus-4-5
   VITE_ANTHROPIC_SUB_AGENT_MODEL=anthropic/claude-haiku-4-5
   ```

   **不要设置** `PORT`（Railway 会自动注入）、`DATABASE_PATH`、`SNAPSHOT_DIR`（Dockerfile 已默认指向 `/data`）。

5. **生成随机密钥**（任选其一）：
   ```bash
   # 方法 A：macOS
   openssl rand -hex 32

   # 方法 B：Python
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

6. **触发部署**：Deploy 标签 → Deploy now。第一次构建约 3-5 分钟。

## 2. 验证

部署成功后 Railway 给你一个 `*.up.railway.app` URL，依次验：

```bash
BASE=https://<your-app>.up.railway.app

# 健康检查
curl -s "$BASE/health" | python3 -m json.tool

# 首页
curl -sI "$BASE/" | head -3   # 应该 200

# Skill 可被 agent 拉取
curl -s "$BASE/skill" | head -20

# 公共创建文档
curl -s -X POST "$BASE/api/public/documents" -H "Content-Type: application/json" -d '{}'
```

浏览器打开首页 → 点「创建新文档」→ 应该跳转到 `/d/<slug>?token=...&welcome=1`，欢迎弹窗弹出。

## 3. 绑自定义域名（可选）

- Railway service → Settings → Networking → Custom Domain
- 填你的域名（如 `zoon.example.com`），按提示加 CNAME
- 生效后把 `PROOF_PUBLIC_ORIGIN` 改成 `https://zoon.example.com`，首页复制的 agent prompt 里的 `/skill` URL 就会用你的域名

## 4. 限流配置

公共创建默认每 IP 每分钟 20 次。要调整：
```
ZOON_PUBLIC_CREATE_RATE_LIMIT_MAX_PER_WINDOW=20
ZOON_PUBLIC_CREATE_RATE_LIMIT_WINDOW_MS=60000
```

紧急关停：
```
ZOON_PUBLIC_CREATE_ENABLED=false
```
（不用重新部署，改完 Railway 会自动重启 service）

## 5. 备份

SQLite 在 Volume 里，定期手动备份：
```bash
# Railway CLI 进入 shell
railway shell
# 在容器内
cp /data/proof-share.db /tmp/backup-$(date +%Y%m%d).db
# 下载到本机
railway run cat /tmp/backup-XXXX.db > ./backup.db
```

或者配一个定时任务同步到 S3（见 `.env` 的 `SNAPSHOT_S3_*` 配置，快照图也可以同步走）。

## 6. 常见坑

- **better-sqlite3 装不上**：Dockerfile 里已经装了 `python3 make g++`，别动。
- **WebSocket 断连**：Railway 默认支持 WS，但别用 HTTP/2 only 配置。
- **`mutationReady: false` 卡住**：Volume 没挂对，`/data` 不可写。检查 Railway Volume 绑定。
- **首页没 CSS**：`dist/` 没构建好。看 Deploy logs，`npm run build` 阶段有没有报错。

## 7. 本地镜像测试（部署前）

```bash
# 构建
docker build -t zoon:local .

# 跑起来
docker run --rm -p 4000:4000 \
  -v $(pwd)/.railway-data:/data \
  -e PROOF_SHARE_MARKDOWN_AUTH_MODE=none \
  -e ZOON_PUBLIC_CREATE_ENABLED=true \
  zoon:local

# 另一个终端
curl http://localhost:4000/health
```

容器里所有数据写到本机 `./.railway-data/`，模拟 Railway Volume。
