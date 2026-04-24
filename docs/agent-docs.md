# Zoon Agent Docs

## Agent Route Alias

Zoon keeps the `/api/agent/*` and `/share/markdown` compatibility routes.

The reusable agent-facing surface is mounted in parallel at:

- `POST /api/public/documents`
- `POST /documents`
- `GET /documents/:slug/state`
- `GET /documents/:slug/snapshot`
- `POST /documents/:slug/ops`
- `POST /documents/:slug/presence`
- `GET /documents/:slug/events/pending`
- `POST /documents/:slug/events/ack`
- `GET /documents/:slug/bridge/state`
- `GET /documents/:slug/bridge/marks`
- `POST /documents/:slug/bridge/comments`
- `POST /documents/:slug/bridge/suggestions`
- `POST /documents/:slug/bridge/rewrite`
- `POST /documents/:slug/bridge/presence`

## Which Editing Method Should I Use?

Zoon has three editing approaches. **Pick one — don't mix them.**

| Goal | Method | Endpoint |
|------|--------|----------|
| **Append / prepend a paragraph or section** | Edit V2 boundary ops | `POST /edit/v2` with `insert_at_end` / `insert_at_start` (no snapshot, no baseRevision) |
| **Replace / anchored insert of a few lines** | Edit V2 (block-level) | `GET /snapshot` → `POST /edit/v2` |
| **Simple text replacement** | Structured edit | `POST /edit` |
| **Replace entire document** | Rewrite | `POST /ops` with `rewrite.apply` |
| **Add a comment** | Ops | `POST /ops` with `comment.add` |

**Start with Edit V2** for most tasks. It uses stable block refs, handles concurrent edits cleanly, and returns clean markdown without internal HTML annotations.

`suggestion.add` now matches against annotated documents correctly and preserves stable anchors, but `edit/v2` is still the better default for programmatic content changes.

`rewrite.apply` is still disruptive. Avoid it if anyone might have the document open: hosted environments block rewrites while live authenticated collaborators are connected, and `force` is ignored there.

## I Just Received A Zoon Link

No browser automation is required. Use HTTP directly (for example, `curl` or your tool's `web_fetch`).

If you received a shared link like:

  http://localhost:4000/d/<slug>?token=<token>

You can discover the API and read the document in one step using **content negotiation** on that same URL.

Fetch JSON (recommended):

  curl -H "Accept: application/json" "http://localhost:4000/d/<slug>?token=<token>"

Fetch raw markdown:

  curl -H "Accept: text/markdown" "http://localhost:4000/d/<slug>?token=<token>"

The JSON response includes:
- `markdown` (document content)
- `_links` (state, ops, docs)
- `agent.auth` hints (how to use the token)

### Quick copy/paste flow (token already in the shared URL)

```bash
SHARE_URL='http://localhost:4000/d/<slug>?token=<token>'
TOKEN='<token>'
SLUG='<slug>'

curl -H "Accept: application/json" "$SHARE_URL"
curl -H "Accept: text/markdown" "$SHARE_URL"
curl -H "Authorization: Bearer $TOKEN" -H "X-Agent-Id: your-agent" "http://localhost:4000/documents/$SLUG/state"
```

## Auth: Token From URL

If a URL contains `?token=`, treat it as an access token:

- Preferred: `Authorization: Bearer <token>`
- Also accepted: `x-share-token: <token>`

## Edit Via Ops (Comments, Suggestions, Rewrite)

Use:

  POST /documents/<slug>/ops

`by` controls authorship. Presence is explicit-only: send `X-Agent-Id: <your-agent-id>` (or `agentId` in the JSON body) when you want the agent to appear in presence.

Add a comment:

  curl -X POST "http://localhost:4000/documents/<slug>/ops?token=<token>" \
    -H "Content-Type: application/json" \
    -H "X-Agent-Id: your-agent" \
    -d '{"type":"comment.add","by":"ai:your-agent","quote":"text to anchor","text":"comment body"}'

Reply to an existing comment thread (use `markId` = the thread root's mark ID from state):

  curl -X POST "http://localhost:4000/documents/<slug>/ops?token=<token>" \
    -H "Content-Type: application/json" \
    -H "X-Agent-Id: your-agent" \
    -d '{"type":"comment.reply","by":"ai:your-agent","markId":"<existing-mark-id>","text":"reply text"}'

**Important:** Use `comment.reply` + `markId` to reply — NOT `comment.add` + `threadId`.
`comment.add` always creates a new standalone comment and requires `quote` to anchor it.
The mark IDs are available from `GET /documents/<slug>/state` in the `marks` field.

**Multi-line text in curl:** Do NOT use bash heredoc or variables with newlines in `-d`.
Newlines in JSON strings must be escaped as `\n`. For multi-line content use Python or Node:

  python3 -c "
  import json, urllib.request
  body = json.dumps({'type':'comment.add','by':'ai:agent','quote':'anchor','text':'line1\nline2'})
  req = urllib.request.Request('http://localhost:4000/documents/<slug>/ops?token=<token>',
    data=body.encode(), headers={'Content-Type':'application/json'})
  print(urllib.request.urlopen(req).read().decode())
  "

Suggest a replace:

  curl -X POST "http://localhost:4000/documents/<slug>/ops?token=<token>" \
    -H "Content-Type: application/json" \
    -H "X-Agent-Id: your-agent" \
    -d '{"type":"suggestion.add","by":"ai:your-agent","kind":"replace","quote":"old text","content":"new text"}'

Create and immediately apply a suggestion:

  curl -X POST "http://localhost:4000/documents/<slug>/ops?token=<token>" \
    -H "Content-Type: application/json" \
    -H "X-Agent-Id: your-agent" \
    -d '{"type":"suggestion.add","by":"ai:your-agent","kind":"replace","quote":"old text","content":"new text","status":"accepted"}'

Rewrite the whole document:

  curl -X POST "http://localhost:4000/documents/<slug>/ops?token=<token>" \
    -H "Content-Type: application/json" \
    -H "X-Agent-Id: your-agent" \
    -d '{"type":"rewrite.apply","by":"ai:your-agent","content":"# New markdown..."}'

## Edit Via Structured Operations (Append, Replace, Insert)

For surgical edits without rewriting the entire document, use the `/edit` endpoint:

  POST /documents/<slug>/edit

All requests require `Content-Type: application/json` and auth via `Authorization: Bearer <token>`.

The body must include an `operations` array (max 50 ops) and a `by` field for authorship. If you want presence, also send `X-Agent-Id: <your-agent-id>` or `agentId` in the body.

### Append to a section

Add content at the end of a named section (matched by heading text):

  curl -X POST "http://localhost:4000/documents/<slug>/edit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -H "X-Agent-Id: your-agent" \
    -d '{
      "by": "ai:your-agent",
      "operations": [
        {"op": "append", "section": "Brandon", "content": "\n\n**Feb 16, 2026**\n\nNew brainstorm idea here."}
      ]
    }'

The `section` value is matched against heading text (e.g., `"Brandon"` matches `### Brandon`).

### Replace text

Find and replace a specific string in the document:

  curl -X POST "http://localhost:4000/documents/<slug>/edit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -H "X-Agent-Id: your-agent" \
    -d '{
      "by": "ai:your-agent",
      "operations": [
        {"op": "replace", "search": "old text to find", "content": "new replacement text"}
      ]
    }'

### Insert after text

Insert content after a specific anchor string:

  curl -X POST "http://localhost:4000/documents/<slug>/edit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -H "X-Agent-Id: your-agent" \
    -d '{
      "by": "ai:your-agent",
      "operations": [
        {"op": "insert", "after": "anchor text to find", "content": "\n\nContent to insert after the anchor."}
      ]
    }'

`insert` only supports `after`. Payloads using `before` are rejected with `INVALID_OPERATIONS`.

### Multiple operations

You can combine operations in a single request (applied in order):

  curl -X POST "http://localhost:4000/documents/<slug>/edit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -H "X-Agent-Id: your-agent" \
    -d '{
      "by": "ai:your-agent",
      "operations": [
        {"op": "append", "section": "Dan", "content": "\n\nNew idea from Dan."},
        {"op": "replace", "search": "(placeholder)", "content": "Actual content here."}
      ]
    }'

### Response

A successful response includes:

  {
    "success": true,
    "slug": "<slug>",
    "updatedAt": "<ISO timestamp>",
    "collabApplied": true
  }

- `collabApplied: true` means the edit was pushed into the live collab session (connected viewers see it in real time).
- `presenceApplied` is only `true` when you also supplied explicit agent identity via `X-Agent-Id`, `agentId`, or `agent.id`.
- If the document changed since you last read it, you may get a `409 STALE_BASE` error — re-fetch state and retry.

Collab convergence fields:
- `collab.status` is render-authoritative (`confirmed` when the ProseMirror/Yjs fragment converged).
- `collab.fragmentStatus` tracks fragment convergence (`confirmed|pending`).
- `collab.markdownStatus` tracks SQL markdown projection convergence (`confirmed|pending`).
- `collabApplied` follows `fragmentStatus` (not markdown projection status).

### Optimistic locking (required for `/edit`)

Pass `baseUpdatedAt` (from a prior state response) to detect concurrent edits:

  {"by": "ai:your-agent", "baseUpdatedAt": "2026-02-16T...", "operations": [...]}

If the document's `updatedAt` doesn't match, you'll get a `409` with `retryWithState` pointing to the state endpoint.

## Update Title Metadata

Use:

  PUT /documents/<slug>/title

Example:

  curl -X PUT "http://localhost:4000/documents/<slug>/title" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{"title":"Updated document title"}'

Discovery:
- `GET /documents/<slug>/state` includes `_links.title` and `agent.titleApi`.

## Edit V2 (Block IDs + Revision Locking)

Use v2 for top-level block edits with stable block IDs and revision-based optimistic locking.

### Get a snapshot

  GET /documents/<slug>/snapshot

Example:

  curl -H "Authorization: Bearer <token>" "http://localhost:4000/documents/<slug>/snapshot"

The response includes `revision`, an ordered `blocks` array with
deterministic refs (`b1`, `b2`, ...), the whole-doc `markdown` string, and
the `marks` payload (comments / suggestions). That's everything an agent
needs — you shouldn't need to also call `/state` (which the editor UI uses
and lacks `blocks[]`).

### Apply edits

  POST /documents/<slug>/edit/v2

Example:

  curl -X POST "http://localhost:4000/documents/<slug>/edit/v2" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -H "Idempotency-Key: <uuid>" \
    -d '{
      "by": "ai:your-agent",
      "baseRevision": 128,
      "operations": [
        { "op": "replace_block", "ref": "b3", "block": { "markdown": "Updated paragraph." } },
        { "op": "insert_after", "ref": "b3", "blocks": [{ "markdown": "## New Section" }] }
      ]
    }'

On success, the response includes the new `revision`, a `snapshot` payload, and a `collab` status.
If your `baseRevision` is stale, you'll receive `STALE_REVISION` plus the latest snapshot for retry.

#### Boundary ops (no snapshot, no baseRevision)

For append / prepend, you don't need a snapshot or a `baseRevision`. Use
`insert_at_end` / `insert_at_start` with one `markdown` string (can
contain multiple blocks):

  curl -X POST "http://localhost:4000/documents/<slug>/edit/v2" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{
      "by": "ai:your-agent",
      "operations": [
        { "op": "insert_at_end", "markdown": "## 金句精选\n\n- 第一句\n- 第二句" }
      ]
    }'

The server auto-rebases and retries on `STALE_REVISION` (appends and
prepends commute), so concurrent writes from multiple agents both land.
Per-op size cap is 50 KB — oversized payloads come back as
`400 MARKDOWN_TOO_LARGE` (`sizeBytes`, `maxBytes`). Empty or
whitespace-only markdown comes back as `400 EMPTY_MARKDOWN` with a
`userHint` string the agent should relay to the user verbatim instead
of silently retrying.

v2 convergence fields:
- `collab.status` remains compatibility status (`confirmed|pending`) and is fragment-authoritative.
- `collab.fragmentStatus` and `collab.markdownStatus` expose render-vs-projection split directly.
- `202` is only expected when fragment convergence is pending.

Precondition contract for v2:
- `baseRevision` is required for anchored ops (`insert_after`, `insert_before`, `replace_block`, `delete_block`, `replace_range`, `find_replace_in_block`).
- `baseRevision` is **optional** for boundary ops (`insert_at_end`, `insert_at_start`); the server auto-rebases when omitted.
- `baseUpdatedAt` is not accepted on `/edit/v2`.

Idempotency guidance:
- Send `Idempotency-Key` for mutation requests (`X-Idempotency-Key` is also accepted for compatibility).
- `/edit/v2` examples include this header because block-level retries are common in automation.

Mutation contract discovery:
- Read `contract.mutationStage` from `GET /documents/<slug>/state` to detect Stage A/B/C rollout.
- `contract.idempotencyRequired` and `contract.preconditionMode` summarize current requirements.

Common mutation contract error codes:
- `IDEMPOTENCY_KEY_REQUIRED`: mutation request omitted idempotency key in required stage.
- `IDEMPOTENCY_KEY_REUSED`: same key reused with a different payload hash.
- `BASE_REVISION_REQUIRED`: stage requires `baseRevision` and request did not provide it.
- `LIVE_CLIENTS_PRESENT`: rewrite blocked because active authenticated collab clients are connected.
  Use `retryWithState` to refresh state, confirm `connectedClients === 0`, and if `forceIgnored=true` do not retry with `force` in hosted environments.
  This response is retryable and includes `reason` + `nextSteps`.
- `REWRITE_BARRIER_FAILED`: rewrite safety barrier failed before mutation; no rewrite was applied.
  This response is retryable and includes `reason` + `nextSteps`; retry with bounded exponential backoff and jitter.

## Presence And Event Polling

Poll for changes:

  GET /documents/<slug>/events/pending?after=<cursor>&limit=100

Ack processed events (editor/owner):

  POST /documents/<slug>/events/ack
  Body: {"upToId": <cursor>, "by": "ai:your-agent"}

## Archived Desktop Workflow

This repo is web-first. Desktop-native workflows are outside the public SDK scope and should be treated as separate implementation work.

## Projection Guardrails And QA

Operational metrics:
- `projection_guard_block_total{reason,source}`
- `projection_drift_total{reason,source}`
- `projection_repair_total{result,reason}`
- `projection_chars_bucket{source,le}`

Staging soak (live browser viewers + repeated `/edit` + `/edit/v2`):

  SHARE_BASE_URL=https://zoon-staging.up.railway.app \
  SOAK_DURATION_MS=300000 \
  npx tsx scripts/staging-collab-projection-soak.ts

## Create A New Shared Doc

If you need to create a share from scratch, use:

  POST /api/public/documents

This is Zoon's public no-auth create route and the one `/skill` points agents to by default.

`POST /documents` still exists as the neutral SDK-style create surface, but hosted deployments may gate it behind policy (for example warn/disable old create flows or require auth on adjacent aliases).
Zoon still accepts `POST /share/markdown` as a compatibility alias.
Legacy create routes like `/api/documents` are internal/legacy and may be warned or disabled on hosted environments.

## Recommended Workflow: Adding Content To An Existing Doc

This is the most reliable way to add a line, row, or section to an existing document:

### Step 1: Get the snapshot

  curl -H "Authorization: Bearer <token>" "http://localhost:4000/documents/<slug>/snapshot"

This returns clean markdown per block (no internal HTML tags) plus stable `ref` identifiers and a `revision` number.
### Step 2: Find the right block

Look through the `blocks` array for the block you want to edit or insert near. Each block has:
- `ref`: stable identifier (e.g., `b3`)
- `markdown`: the clean markdown content of that block
- `type`: block type (e.g., `paragraph`, `heading`, `table`)

### Step 3: Apply your edit

  curl -X POST "http://localhost:4000/documents/<slug>/edit/v2" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -H "Idempotency-Key: <uuid>" \
    -d '{
      "by": "ai:your-agent",
      "baseRevision": 128,
      "operations": [
        { "op": "insert_after", "ref": "b3", "blocks": [{ "markdown": "New content here." }] }
      ]
    }'

### Step 4: Handle conflicts

If you get `STALE_REVISION`, the response includes the latest snapshot — re-read the blocks and retry.

## Troubleshooting

### `ANCHOR_NOT_FOUND` on `comment.add`

This means the `quote` field doesn't match any text in the document. Common causes:

1. **Trying to reply to a thread**: Use `comment.reply` + `markId` instead of `comment.add` + `threadId`. See the "Reply to an existing comment thread" example above.
2. **Document contains HTML annotations**: Previously-authored text may contain internal `<span data-proof="authored">` provenance tags. Re-read `Accept: text/markdown` to get the clean text, use a substring of that as `quote`.
3. **Multi-line quote**: Quote must be a single continuous string matching the document. Avoid quoting across paragraph boundaries.

### `ANCHOR_NOT_FOUND` on `/edit` replace or insert

The `/edit` endpoint searches for your `search` or `after` text in the document. If the document was previously edited by agents, it may contain internal `<span data-proof="authored">` HTML tags. The search now automatically falls back to matching against clean text (with tags stripped), so this should be rare. If it still fails, the text genuinely doesn't exist in the document — re-read state and verify.

### `LIVE_CLIENTS_PRESENT` on `rewrite.apply`

`rewrite.apply` is blocked when authenticated collaborators are connected. Outside hosted environments you can pass `"force": true`, but on hosted environments `force` is ignored. If you still prefer the safer path:
1. Use `/edit` or `/edit/v2` instead (they work with live clients).
2. Wait for clients to disconnect (poll `/state` and check `connectedClients`).

### Suggestion anchors not matching

`suggestion.add` now resolves quotes against clean text even when the stored markdown contains internal `<span data-proof="authored">` annotations. If you still get `ANCHOR_NOT_FOUND`, re-read state and verify the quote text genuinely exists.

### Document content looks corrupted after suggestion reject cycles

Repeated suggest/reject cycles on annotated documents now preserve stable suggestion anchors so the document text should remain unchanged. If you still see unexpected content drift, re-read `Accept: text/markdown` and report the exact request/response pair.

### `COLLAB_SYNC_FAILED` errors

Edits via the API can fail when a browser has the document open with an active Yjs collab session. The `/edit` and `/edit/v2` endpoints handle this gracefully, but `rewrite.apply` does not. If you hit this, retry after a short delay or use `/edit`/`/edit/v2` instead.
