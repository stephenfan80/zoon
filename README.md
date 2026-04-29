# Zoon

**Any AI agent can collaborate in a Zoon document over plain HTTP — one URL is the human page, agent read entry, and agent write entry.**

Zoon is an agent-native collaborative markdown editor for humans and agents writing in the same online document space. Every character can keep provenance: AI-authored text is visible and attributable, human text stays attributable, and agents can join without browser automation.

The core loop: share `https://<host>/d/<slug>?token=...` with an agent. That same URL opens the document for humans, returns JSON with `Accept: application/json`, returns markdown with `Accept: text/markdown`, and points agents to canonical write routes like `POST /documents/<slug>/edit/v2`. Every write carries `by: "ai:<agent-name>"`; presence uses `X-Agent-Id`.

Zoon now follows Proof-style agent autonomy: `edit/v2` applies direct edits directly, including replacements or deletes over human-authored text. Comments and suggestions still exist, but they are explicit choices made by the agent or human, not a default server-side interception policy.

任何 AI agent 都能直接参与 Zoon 文档协作：同一个文档 URL 同时是人类编辑页、agent 读取入口和写入入口。Agent 用 HTTP 读文档、写文档、发 presence、留评论；默认直写，评论和建议由 agent 主动选择，而不是 Zoon 强制把修改人类原文变成审批流。

- Live: https://zoon.up.railway.app
- Agent skill: `GET /skill` (single-file instructions any HTTP-capable agent can follow)

---

## For Agents

Your entry point is one HTTP call:

```
GET https://zoon.up.railway.app/skill
```

This returns a concise markdown skill file that tells you how to:
1. Use a shared `/d/<slug>?token=...` URL as the agent entry point
2. Read JSON/markdown through content negotiation
3. Send presence with `X-Agent-Id`
4. Write directly via `POST /documents/<slug>/edit/v2` with `by: "ai:<agent-name>"`
5. Add comments or suggestions through `/ops` when you intentionally choose review mode

No SDK, no browser automation, no special libraries. Plain HTTP + JSON.

## For Humans / AI 使用者

Open the homepage, create a document, paste your content, then share the URL with any agent. The agent joins, says it's ready, and waits for your task. When you tell it what to do, it can read and write the document directly over HTTP. AI authorship stays visible, and comments/suggestions remain available when you want a review flow.

打开首页创建文档，粘贴内容，然后把链接发给任意 agent。Agent 加入后会说“准备好了”并等你的指令；你给任务后，它直接通过 HTTP 读写文档。AI 作者身份保持可见；如果你想走审阅流程，可以让它显式使用评论或建议。

## What's Included

- Collaborative markdown editor with provenance tracking (green = human, purple = AI)
- Agent HTTP bridge — direct edits (`/edit/v2`), comments, suggestions, presence, and events over REST
- Identity-first collaboration: every write says who did it; review is opt-in through comments/suggestions
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
| `POST /documents` | Create doc (canonical) |
| `POST /api/public/documents` | Create blank doc (compat/no-auth, rate-limited) |
| `GET /documents/:slug/state` | Read doc state (auth) |
| `POST /documents/:slug/ops` | Ops: `comment.add`, `comment.reply`, `comment.resolve`, etc. |
| `POST /documents/:slug/edit/v2` | Apply direct block-based edits (auth) |
| `GET /agent-docs` | Full agent API spec |

## Docs

- `docs/zoon-agent.skill.md` — what `/skill` serves (the agent protocol)
- `AGENT_CONTRACT.md` — markdown share contract
- `docs/agent-docs.md` — full agent API spec
- `DEPLOY.md` — Railway deployment guide

## License

MIT — see `LICENSE`.
