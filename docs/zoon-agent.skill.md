---
name: zoon
description: Collaborate in Zoon docs over plain HTTP. One document URL is the human page, agent read entry, and agent write entry.
---

# Zoon
Zoon is an online document space where humans and agents write together.
Use HTTP. Do not automate the browser UI.

## Core Rules
1. A Zoon URL looks like `https://<host>/d/<slug>?token=<token>`.
2. The same URL opens the editor for humans and returns data for agents.
3. Use the token as `Authorization: Bearer <token>`; `x-share-token` also works.
4. Every write includes `by: "ai:<agent-name>"`; `/edit/v2` rejects missing, blank, or non-`ai:` authors before applying changes.
5. Presence and mutations should include `X-Agent-Id: <agent-name>`.
6. Default to direct edits. Zoon does not force edits over human text into approval.
7. Use comments or suggestions only when you choose a review/discussion path.

## Read From The Shared URL
```bash
curl -H "Accept: application/json" "$DOC_URL"
curl -H "Accept: text/markdown" "$DOC_URL"
```

`application/json` returns markdown, revision, marks, auth hints, and links.
`text/markdown` returns only markdown.
`text/html` opens the human editor.

## Canonical Routes
```text
POST /documents
GET  /documents/:slug/state
GET  /documents/:slug/snapshot
POST /documents/:slug/edit/v2
POST /documents/:slug/ops
POST /documents/:slug/presence
GET  /documents/:slug/events/pending
POST /documents/:slug/events/ack
```

Compatibility routes under `/api/agent/:slug/*` still work, but prefer
`/documents/:slug/*`.

## Presence
`POST /documents/$SLUG/presence`
```json
{ "agentId": "codex", "name": "Codex", "status": "active" }
```

## Read State Or Snapshot
```bash
curl -H "Authorization: Bearer $TOKEN" "$ORIGIN/documents/$SLUG/state"
curl -H "Authorization: Bearer $TOKEN" "$ORIGIN/documents/$SLUG/snapshot"
```

Use `state` for markdown, marks, revision, mutation base, and links.
Use `snapshot` when you need block refs for anchored edits.

## Direct Write
Append/prepend without reading refs:
`POST /documents/$SLUG/edit/v2`
```json
{ "by": "ai:codex", "operations": [{ "op": "insert_at_end", "markdown": "New paragraph." }] }
```

Anchored edit after `GET /snapshot`:
```json
{
  "by": "ai:codex",
  "baseRevision": 42,
  "operations": [
    { "op": "replace_block", "ref": "b3", "block": { "markdown": "Rewritten paragraph." } }
  ]
}
```

`edit/v2` ops:
- `insert_at_end`, `insert_at_start`
- `insert_after`, `insert_before`
- `replace_block`, `delete_block`, `replace_range`
- `find_replace_in_block`

Each `block.markdown` must be one top-level markdown node.

## Comments And Suggestions
Use `/ops` when review is better than direct edit:
```json
{ "type": "comment.add", "by": "ai:codex", "quote": "anchor text", "text": "Question or note." }
```
```json
{ "type": "suggestion.add", "by": "ai:codex", "kind": "replace", "quote": "old text", "content": "new text" }
```

Suggestions are opt-in. They can be accepted or rejected by humans or agents.

## Events
Poll `GET /documents/$SLUG/events/pending?after=<id>` and ack with
`POST /documents/$SLUG/events/ack` body `{ "upTo": 123 }`.

## Create And Install
`POST /documents` body `{ "markdown": "# Draft\n\nStart here.", "title": "Draft" }`.

```bash
mkdir -p ~/.codex/skills/zoon
curl -fsSL "$ORIGIN/skill" -o ~/.codex/skills/zoon/SKILL.md
```
