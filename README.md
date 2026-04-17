# Zoon

**Any AI agent can collaborate in a Zoon document — just `GET /skill` and follow the protocol.**

Zoon is an agent-native collaborative markdown editor. Every character knows whether a human or an AI wrote it. The human sees AI contributions in purple, their own in green.

The core loop: an agent reads `/skill`, proposes changes as comments, the human replies with a thumbs-up, and only then does the agent apply the edit.

任何 AI agent 都能直接参与 Zoon 文档协作 — 只需读取 `/skill` 并遵循协议。人类写的字是绿色，AI 写的是紫色，每个字符都有来源追踪。

- Live: https://zoon.up.railway.app
- Agent skill: `GET /skill` (single-file instructions any HTTP-capable agent can follow)

---

## For Agents

Your entry point is one HTTP call:

```
GET https://zoon.up.railway.app/skill
```

This returns a complete markdown skill file that tells you how to:
1. Connect to a document via `GET /documents/<slug>/state`
2. Propose changes as comments (`comment.add`)
3. Wait for human approval (the thumbs-up protocol)
4. Apply edits via `POST /api/agent/<slug>/edit/v2`

No SDK, no browser automation, no special libraries. Plain HTTP + JSON.

## For Humans / AI 使用者

Open the homepage, create a document, paste your content, then share the URL with any agent. The agent connects, reads the doc, and proposes changes as comments. You review, reply with a thumbs-up, and the agent applies the edit.

打开首页创建文档，粘贴内容，然后把链接发给任意 agent。Agent 连接后会以评论形式提出修改建议，你回复 thumbs-up 后 agent 才会执行修改。

## What's Included

- Collaborative markdown editor with provenance tracking (green = human, purple = AI)
- Agent HTTP bridge — read state, add comments, apply edits, all via REST
- Thumbs-up protocol enforcing human-in-the-loop for every edit
- Realtime collaboration (WebSocket + Yjs) — multiple humans + agents in the same doc
- Auto-derived document titles from first heading
- Downloadable agent skill at `/skill`
- Public homepage with no-auth document creation (rate-limited)

## Local Development / 本地开发

Requirements: Node.js 20+

```bash
npm install
npm run serve     # API + WebSocket on http://localhost:4000
npm run dev       # Vite dev for the editor
```

Open `http://localhost:4000/` for the homepage.

## Build

```bash
npm run build
```

## Deploy / 部署

See `DEPLOY.md` for Railway deployment (Dockerfile + Volume).

## Core Routes

| Endpoint | Purpose |
|---|---|
| `GET /skill` | Agent skill (markdown, public) — **start here** |
| `GET /` | Homepage |
| `POST /api/public/documents` | Create blank doc (no-auth, rate-limited) |
| `GET /documents/:slug/state` | Read doc state (auth) |
| `POST /documents/:slug/ops` | Ops: `comment.add`, `comment.reply`, `comment.resolve`, etc. |
| `POST /api/agent/:slug/edit/v2` | Apply block-based edits (auth) |
| `GET /agent-docs` | Full agent API spec |

## Docs

- `docs/zoon-agent.skill.md` — what `/skill` serves (the agent protocol)
- `AGENT_CONTRACT.md` — markdown share contract
- `docs/agent-docs.md` — full agent API spec
- `DEPLOY.md` — Railway deployment guide

## License

MIT — see `LICENSE`.
