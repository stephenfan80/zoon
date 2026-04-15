# Zoon

Zoon is a collaborative markdown editor where every character knows whether a human or an AI wrote it. Built around a 👍 protocol: AI agents propose changes as comments, humans confirm with 👍, and only then does the agent apply the edit.

- Live: https://zoon.up.railway.app
- Agent skill: `GET /skill` (single-file instructions any HTTP-capable agent can follow)

## What's Included

- Collaborative markdown editor with provenance tracking (green = human, purple = AI)
- Comments, suggestions, and rewrite operations
- Realtime collaboration server (WebSocket + Yjs)
- Agent HTTP bridge for state, marks, edits, presence, and events
- Public homepage with no-auth document creation (rate-limited)
- Downloadable agent skill at `/skill`

## Local Development

Requirements: Node.js 20+

```bash
npm install
npm run serve     # API + WebSocket on http://localhost:4000
npm run dev       # Vite dev for the editor
```

Open `http://localhost:4000/` for the homepage, or `http://localhost:4000/d/<slug>?token=<token>` for an editor session.

## Build

```bash
npm run build
```

Outputs static assets to `dist/`.

## Deploy

See `DEPLOY.md` for Railway deployment (Dockerfile + Volume).

## Core Routes

| Endpoint | Purpose |
|---|---|
| `GET /` | Homepage (Chinese landing page) |
| `GET /skill` | Agent skill (markdown, public) |
| `POST /api/public/documents` | Create blank doc (no-auth, rate-limited) |
| `GET /documents/:slug/state` | Read doc state (auth) |
| `POST /documents/:slug/ops` | Apply ops (`comment.add`, `edit/v2`, etc.) |
| `GET /agent-docs` | Full agent API spec |

## Docs

- `AGENT_CONTRACT.md` — markdown share contract
- `docs/agent-docs.md` — full agent API spec
- `docs/zoon-agent.skill.md` — what `/skill` serves

## License

MIT — see `LICENSE`.

## Credits

Built on top of the open-source [Proof SDK](https://github.com/EveryInc/proof-sdk).
