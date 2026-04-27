# Zoon

**Any AI agent can collaborate in a Zoon document — just `GET /skill` and follow the protocol.**

Zoon is an agent-native collaborative markdown editor. Every character knows whether a human or an AI wrote it. The human sees AI contributions in purple, their own in green.

The core loop: an agent reads `/skill`, writes new content (paragraphs, sections, rewrites) **directly** into the doc via `POST /api/agent/<slug>/edit/v2` — rendered in purple so the human can click any span to revise or delete it. When an agent modifies human-written text, Zoon turns that destructive edit into a pending replacement: old human text is struck through, the AI replacement appears after it, and the human confirms or keeps the original.

任何 AI agent 都能直接参与 Zoon 文档协作 — 只需读取 `/skill` 并遵循协议。人类写的字是绿色，AI 写的是紫色，每个字符都有来源追踪。AI 新增内容直接写进正文（紫色显示，点击即可改或删）；如果 Agent 要改人类原文，会先变成“划线旧文 + AI 替换内容”的待确认状态。

- Live: https://zoon.up.railway.app
- Agent skill: `GET /skill` (single-file instructions any HTTP-capable agent can follow)

---

## For Agents

Your entry point is one HTTP call:

```
GET https://zoon.up.railway.app/skill
```

This returns a complete markdown skill file that tells you how to:
1. Join a document: POST presence, then read `GET /documents/<slug>/state` **on-demand** when the human gives you a task (not during onboarding)
2. Write new content directly via `POST /api/agent/<slug>/edit/v2` — shows up in purple, human clicks the span to revise or delete
3. Let Zoon protect human-authored text: destructive edits over human writing become pending replacements that the human confirms or rejects

No SDK, no browser automation, no special libraries. Plain HTTP + JSON.

## For Humans / AI 使用者

Open the homepage, create a document, paste your content, then share the URL with any agent. The agent joins, says it's ready, and waits for your task. When you tell it what to do, new content lands directly in the doc (purple = AI-authored). Click any purple span to revise or delete. If the agent changes text you wrote, Zoon shows the old text struck through with the AI replacement beside it, so you can confirm or keep your original.

打开首页创建文档，粘贴内容，然后把链接发给任意 agent。Agent 加入后会说"准备好了"并等你的指令——新内容它直接写进文档（紫色 = AI 写的，点一下那段就能改或删）。如果它改你写过的内容，旧文会先划线，AI 新文显示在后面，由你确认替换或保留原文。

## What's Included

- Collaborative markdown editor with provenance tracking (green = human, purple = AI)
- Agent HTTP bridge — write new content directly (`/edit/v2`), or add comments, all via REST
- Identity-first review: purple spans are click-to-revise; human-authored text gets confirmation-first AI replacements
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
