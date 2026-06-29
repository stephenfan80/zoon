# Zoon

**Zoon is a Markdown editor for agent-generated drafts.**

Zoon 是给 Agent 输出用的 Markdown 编辑器。把 AI 写好的方案、PRD、文章放进来，继续人工编辑；需要 AI 帮忙时，选中一段让它按你的要求改。

Use Zoon when Codex, Claude Code, Cursor, ChatGPT, or another agent has already produced a long Markdown draft, but the draft still needs human editing, local rewrites, more detail, shorter wording, or a voice that sounds like you.

The core loop:

- Put an AI-generated Markdown draft into Zoon.
- Edit it like a normal document.
- Select one paragraph and ask AI to rewrite, expand, shorten, or change the tone.
- Keep working on the same draft until it is ready to share or ship.

- Live: https://zoon.up.railway.app
- Agent skill: `GET /skill` (single-file instructions any HTTP-capable agent can follow)
- Codex plugin: https://github.com/stephenfan80/zoon-codex-plugin

---

## For Codex Users

Install the Zoon Codex plugin marketplace:

```bash
codex plugin marketplace add stephenfan80/zoon-codex-plugin
```

Then enable `Zoon` in Codex's Plugins list and start a new Codex session.
Codex can turn a long Markdown answer into a Zoon document workspace, open it in
the Codex Browser, and keep later revisions in the same document. You can say
"continue in Zoon", "push this plan to Zoon", or send `/zoon` to make future
plan-grade output go into Zoon by default. A pasted Zoon document URL still opens
the existing document.

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

Open the homepage, create a document, and paste an AI-generated draft. You can keep editing the Markdown yourself, or select a section and ask an agent to revise only that part. Zoon is especially useful for plans, PRDs, reports, articles, and other long drafts that start in an AI tool but need a real editing pass before they are usable.

打开首页创建文档，粘贴 AI 写好的方案、PRD 或文章。你可以继续人工编辑，也可以选中某一段，让 Agent 按你的要求重写、补充、缩短或改成你的语气。

## What's Included

- Markdown editor for agent-generated drafts
- Local AI-assisted revisions: rewrite, expand, shorten, or change tone on selected text
- Comments, suggestions, and direct edits when you want review instead of immediate changes
- Clear change context so AI does not silently scramble the original draft
- Agent HTTP bridge — direct edits (`/edit/v2`), comments, suggestions, presence, and events over REST
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
- `docs/handoffs/2026-06-29-agent-workbench-doc-collaboration-plan.md` — product framing for editing agent-generated Markdown drafts in Zoon
- `docs/handoffs/2026-06-29-agent-workbench-v1-acceptance-checklist.md` — V1 checklist for the agent-output-to-collaborative-document loop
- `AGENT_CONTRACT.md` — markdown share contract
- `docs/agent-docs.md` — full agent API spec
- `DEPLOY.md` — Railway deployment guide

## License

MIT — see `LICENSE`.
