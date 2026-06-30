# Zoon Agent Contract

This contract defines the public Zoon flow for creating, reading, and operating
on shared documents over HTTP. If you're writing an agent or an SDK against
Zoon, these are the endpoints you should depend on. Everything outside this
list is internal implementation detail and may change without notice.

**Base URL**: `https://zoon.up.railway.app` (public deployment)
**Agent protocol text**: `GET /skill` (concise source of truth for the HTTP
flow; read this once before you mutate anything).

## Public endpoints (the contract)

| # | Route | Purpose |
|---|---|---|
| 1 | `POST /documents` | Create a new shared doc from markdown |
| 2 | `GET /documents/:slug/state` | Read doc state + `mutationBase.token` for preconditions |
| 3 | `GET /documents/:slug/snapshot` | Read block refs for anchored edits |
| 4 | `POST /documents/:slug/edit/v2` | Direct structural edit (multi-op transaction) |
| 5 | `POST /documents/:slug/ops` | Type-dispatched mutations (comments, suggestions, rewrite) |
| 6 | `POST /documents/:slug/presence` | Announce / heartbeat agent presence |
| 7 | `GET /documents/:slug/events/pending?after=<id>` | Poll for new events |
| 8 | `POST /documents/:slug/events/ack` | Ack processed event ids |
| 9 | `POST /api/agent/bug-reports` | Report Zoon-side bugs back to the team |
| 10 | `GET /skill` | Full agent protocol (read first) |

Everything else you might see in network traces (`/:slug/marks/*`,
`/:slug/rewrite`, `/:slug/snapshot`, `/:slug/edit`, `/:slug/quarantine`,
`/:slug/repair`, `/:slug/clone-from-canonical`) is **not** part of the public
contract. See "Not in the contract" at the bottom.

Compatibility routes under `/api/agent/:slug/*` and `POST /api/public/documents`
are kept for older agents, but new agents should depend on `/documents/*`.

## 1. Create a doc

```http
POST /documents
Content-Type: application/json
```

```json
{
  "title": "Barista Pro 上市计划",
  "markdown": "# Barista Pro 上市计划\n\n…"
}
```

Response:

```json
{
  "success": true,
  "slug": "h0j9vpdf",
  "accessToken": "60d4f886-c3a8-4297-a42f-6e3bfa524fc3",
  "ownerSecret": "68e480bb-99e1-445f-8c48-e1538f1680f9",
  "shareState": "ACTIVE",
  "createdAt": "2026-04-21T09:16:44.729Z",
  "url": "https://zoon.up.railway.app/d/h0j9vpdf?token=...",
  "agentInviteMessage": "…ready-to-paste invitation for another agent…"
}
```

After this call returns, the doc is **eagerly hydrated**: the Y.doc is
materialized and the markdown projection is fresh. You can immediately go to
step 2 without a warm-up poll loop.

## 2. Authentication on every subsequent call

Pass the token one of two ways:

- Header: `Authorization: Bearer <accessToken>`
- Header: `x-share-token: <accessToken>`
- Query string: `?token=<accessToken>`

Plus `X-Agent-Id: <your-agent-id>` on mutation routes so Zoon can attribute
the write to you.

Token semantics:

- `accessToken` — scoped link credential for `viewer` / `commenter` / `editor`
  roles. This is what you normally send.
- `ownerSecret` — full-owner credential. Needed only for quarantine / repair /
  clone-from-canonical. Store it, never expose it in UI.
- `mutationBase.token` — an **mt1 token** returned inside `/state`. Opaque
  string; send it back as `baseToken` on the next mutation to pin the
  precondition. Refresh it by re-reading `/state`.

## 3. Read state

```http
GET /documents/:slug/state?token=<accessToken>
```

Key fields you should read:

- `markdown` — current document content (Proof span tags stripped for you)
- `revision`, `updatedAt` — precondition primitives
- `mutationBase.token` — preferred precondition for mutations
- `mutationReady`, `projectionFresh`, `repairPending` — liveness hints
- `retryAfterMs` — **present only when projection is stale**; wait that many
  milliseconds before re-polling. Reading `/state` also nudges the repair
  queue, so a repeat poll after the hint usually finds fresh state.
- `_links`, `agent` — discovery objects pointing back at the public endpoints
  above.

## 4. Mutations — proposals via `/ops`, explicit direct writes via `/edit/v2`

Zoon separates two kinds of writes:

- **Collaboration proposals** (comments, `@zoon` task comments, reviewable
  replacements, accept/reject, discussion threads, rewrites scoped by role)
  → `POST /documents/:slug/ops` with type dispatch. This is the default path
  whenever a human expects to review the change before it enters the document.
- **Explicit direct content writes** (new paragraphs, new sections, table
  insertion, structural reorgs, or immediate execution outside a comment/review
  flow) → `POST /documents/:slug/edit/v2`. These apply directly and are tagged
  with the agent identity (`ai:<agent-id>`). `/edit/v2` rejects missing, blank,
  or non-`ai:` authors before applying changes.

Both paths share the same `baseToken` precondition (§5) and require an
`Idempotency-Key` header. Reusing the same key replays the prior result
instead of double-applying.

Product rule: **Agent can propose edits, but cannot confirm replacement for the
human.** A comment-sourced AI rewrite must create a pending `suggestion.add`;
only a later `suggestion.accept` from a human/editor action applies it.

### 4.1 Content writes — `POST /documents/:slug/edit/v2`

```http
POST /documents/:slug/edit/v2
Content-Type: application/json
Authorization: Bearer <accessToken>
X-Agent-Id: <your-agent-id>
Idempotency-Key: <unique-per-attempt>
```

```json
{
  "by": "ai:<your-agent-id>",
  "baseRevision": 42,
  "operations": [
    {
      "op": "insert_after",
      "ref": "<block ref from /state>",
      "blocks": [
        { "markdown": "## New section" },
        { "markdown": "First paragraph of the new section." }
      ]
    }
  ]
}
```

Supported `/edit/v2` `op` values (authoritative list; see
`server/agent-edit-v2.ts`):

| op | Required fields | Meaning |
|---|---|---|
| `insert_after` | `ref`, `blocks: [{markdown}, …]` | Insert blocks after a block |
| `insert_before` | `ref`, `blocks: [{markdown}, …]` | Insert blocks before a block |
| `replace_block` | `ref`, `block: {markdown}` | Overwrite one block |
| `delete_block` | `ref` | Remove one block |
| `replace_range` | `fromRef`, `toRef`, `blocks: [{markdown}, …]` | Replace a contiguous range of blocks |
| `find_replace_in_block` | `ref`, `find`, `replace`, `occurrence: first\|all` | Text-level replace inside one block |

Every block's `markdown` string must parse into **exactly one** top-level
markdown node. A blank line (`\n\n`) inside one string is almost always a bug —
split into two `blocks[]` entries. Max 50 operations per call.

`replace_block`, `delete_block`, and `replace_range` return
`COLLAB_ANCHOR_PROTECTED` when the target block contains an active comment or
pending suggestion. Create a pending `suggestion.add` instead.

`/edit/v2` requires `AGENT_EDIT_V2_ENABLED=1` on the server; the
`editV2` link in `/state._links` is only present when enabled.

### 4.2 Metadata writes — `POST /documents/:slug/ops`

```http
POST /documents/:slug/ops
Content-Type: application/json
Authorization: Bearer <accessToken>
X-Agent-Id: <your-agent-id>
Idempotency-Key: <unique-per-attempt>
```

```json
{
  "op": "comment.add",
  "baseToken": "mt1:…from state.mutationBase.token…",
  "body": "This sentence is ambiguous.",
  "anchor": { "path": [2, 1], "offset": 14 }
}
```

Supported `op` types (authoritative list; see `server/document-ops.ts`):

- `comment.add`, `comment.reply`, `comment.resolve`, `comment.unresolve`
- `suggestion.add`, `suggestion.accept`, `suggestion.reject`
- `rewrite.apply`

For comment-driven rewrites, reply to the comment and create a pending
suggestion that points back to the source task:

```json
{
  "type": "comment.reply",
  "by": "ai:<your-agent-id>",
  "markId": "<comment-mark-id>",
  "text": "已生成替换建议，请确认是否替换。"
}
```

```json
{
  "type": "suggestion.add",
  "by": "ai:<your-agent-id>",
  "kind": "replace",
  "quote": "old text",
  "content": "new text",
  "sourceCommentId": "<comment-mark-id>"
}
```

`sourceMarkId` and `sourceCommentId` are optional tracking fields for proposals
that came from a visible comment/task. If an AI request includes either source
field and also tries `status:"accepted"`, the server returns
`CONFIRMATION_REQUIRED`; the user must accept or reject in the review flow.

## 5. Error contract

Precondition and projection-readiness failures return 409 with:

```json
{
  "success": false,
  "code": "STALE_BASE" | "PROJECTION_STALE" | "AUTHORITATIVE_BASE_UNAVAILABLE",
  "error": "…human-readable reason…",
  "retryWithState": "/documents/:slug/state",
  "retryAfterMs": 500,
  "nextSteps": [
    "Fetch GET /documents/:slug/state to refresh base + repairPending.",
    "Retry this mutation once state.repairPending is false."
  ]
}
```

- `retryAfterMs` — how long the agent should wait before re-polling `/state`.
  `0` means "no wait, just re-read now".
- `nextSteps` — concrete recovery steps. Treat as actionable, in order.

A 409 with `code: "STALE_BASE"` means someone else edited in between — your
`baseToken` no longer matches canonical. Re-read `/state`, use the fresh
`mutationBase.token`, retry.

## 6. Events poll & ack

```http
GET  /documents/:slug/events/pending?after=<lastEventId>&limit=50
POST /documents/:slug/events/ack    {"upTo": <lastProcessedId>}
```

Poll with the last event id you've processed; ack after you've acted on them.
Events include: new comments, new suggestions, ack events, presence changes.

## 7. Presence

```http
POST /documents/:slug/presence
{"agentId": "claude-42", "name": "Claude", "status": "active"}
```

Send on join and periodically (every 20-30s) while active. On disconnect hit
`POST /documents/:slug/presence/disconnect`. Presence events surface in the
document topbar so humans can see agents arriving and leaving.

## 8. Bug reports

If you hit Zoon-side weirdness (stale reads that don't clear, mysterious 500s,
contract violations), file it through:

```http
POST /api/agent/bug-reports
```

See `GET /api/agent/bug-reports/spec` for the required payload shape. A
successful bug report opens a GitHub issue and returns its number.

## Not in the contract

These endpoints exist today but are **implementation detail**. They may be
consolidated, renamed, or removed. Prefer the public equivalents:

| Internal / deprecated | Use instead |
|---|---|
| `POST /:slug/marks/comment` | `POST /ops { op: "comment.add" }` |
| `POST /:slug/marks/reply` | `POST /ops { op: "comment.reply" }` |
| `POST /:slug/marks/resolve` | `POST /ops { op: "comment.resolve" }` |
| `POST /:slug/marks/unresolve` | `POST /ops { op: "comment.unresolve" }` |
| `POST /:slug/marks/suggest-replace` | `POST /ops { op: "suggestion.add" }` |
| `POST /:slug/marks/suggest-insert` | `POST /ops { op: "suggestion.add" }` |
| `POST /:slug/marks/suggest-delete` | `POST /ops { op: "suggestion.add" }` |
| `POST /:slug/marks/accept` | `POST /ops { op: "suggestion.accept" }` |
| `POST /:slug/marks/reject` | `POST /ops { op: "suggestion.reject" }` |
| `POST /:slug/rewrite` | `POST /ops { op: "rewrite.apply" }` |
| `POST /:slug/edit` | `POST /edit/v2` |
| `GET /:slug/snapshot` | `GET /state` (gated behind `AGENT_EDIT_V2_ENABLED`) |

**Owner-only admin** (not intended for agent SDK consumption):
`POST /:slug/quarantine`, `POST /:slug/repair`,
`POST /:slug/clone-from-canonical` — operate on canonical document state,
require `ownerSecret`.

## Minimal agent flow

```bash
# 1. Create
curl -X POST https://zoon.up.railway.app/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"Plan","markdown":"# Plan\n\nShip it."}'
# → returns slug + accessToken

# 2. Read state (ready immediately — eager hydration, see PR #28)
curl "https://zoon.up.railway.app/documents/$SLUG/state?token=$TOKEN"
# → read revision + block refs + mutationBase.token

# 3. Add new content directly via /edit/v2 when the user asked for immediate insertion
curl -X POST "https://zoon.up.railway.app/documents/$SLUG/edit/v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-Id: my-agent" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "by":"ai:my-agent",
    "baseRevision":'"$REVISION"',
    "operations":[
      {"op":"insert_after","ref":"'"$REF"'","blocks":[{"markdown":"New paragraph."}]}
    ]
  }'

# 3'. Comment/review tasks use /ops and stay pending until human confirmation
curl -X POST "https://zoon.up.railway.app/documents/$SLUG/ops" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-Id: my-agent" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"op":"suggestion.add","baseToken":"'"$MT1"'","by":"ai:my-agent","kind":"replace","quote":"Ship it.","content":"Ship the first milestone.","sourceCommentId":"<comment-mark-id>"}'
```

That's the whole contract. For the concise agent protocol, read `GET /skill`.
