---
name: zoon
description: Collaborate inside a Zoon document. Read the doc first, leave 👍-gated comment suggestions, and only apply edits after the human replies 👍. Use plain HTTP — no browser automation needed.
---

# Zoon Agent Skill

You just received a Zoon document URL. A human is working in a shared editor and
invited you to help. Follow this protocol exactly.

Zoon tracks authorship: every character the human writes is tagged `human:`,
every character you write is tagged `ai:<your-name>`. The human sees your
contributions in purple, theirs in green. Be honest about which is which.

## ⚠️ Before you start

- **There are exactly two endpoints you'll call.** `POST /documents/<slug>/ops`
  handles comments, suggestions, and rewrites (§4 table). `POST /api/agent/<slug>/edit/v2`
  handles direct content edits after 👍. Don't use the legacy `/api/agent/<slug>/edit`
  — it returns `LEGACY_EDIT_UNSAFE` as soon as any other writer is connected.
- **Re-fetch `/state` right before every write.** Revision numbers bump on
  every successful op — yours and everyone else's. Don't cache a revision
  across writes. If a write returns `STALE_REVISION`, the 409 body carries the
  latest `revision`; use it as the new `baseRevision` and retry once.
- **One 👍 = one edit request.** Don't batch three human approvals into one
  `/edit/v2` call. Batching breaks the 👍 audit trail and makes conflicts
  harder to recover from.
- **Each `block.markdown` must be one top-level node.** The `/edit/v2` endpoint
  parses each block entry as a standalone markdown snippet and rejects
  anything that produces more than one top-level node with
  `INVALID_BLOCK_MARKDOWN`. If you want to add a heading + a paragraph + a
  table, that's **three** entries in `blocks[]`, not one. Rule of thumb: one
  heading / paragraph / thematic-break / table / list per block.

  **Rule of thumb: a blank line (`\n\n`) inside one `markdown` string is
  almost always a bug.** It's the markdown separator between top-level
  nodes — if you see one, split the string into two `blocks[]` entries.

  Common mistakes:

  | ❌ One block, rejected with `INVALID_BLOCK_MARKDOWN` | ✓ Split into two blocks |
  |---|---|
  | `"**Section title**\n\n- item 1\n- item 2"` | `"**Section title**"` + `"- item 1\n- item 2"` |
  | `"## Heading\n\nIntro paragraph."` | `"## Heading"` + `"Intro paragraph."` |
  | `"Paragraph A.\n\nParagraph B."` | `"Paragraph A."` + `"Paragraph B."` |
  | `"Before table:\n\n\| col \|\n\|---\|\n\| x \|"` | `"Before table:"` + `"\| col \|\n\|---\|\n\| x \|"` |

  Single-node content — a whole list, a whole table, a whole code fence, a
  paragraph with hard line breaks — stays in one block. The test is the
  parser, not line count.

## 1. Connect and read — always first

The URL looks like `https://<host>/d/<slug>?token=<token>`. Extract `<slug>`,
`<token>`, and `<host>` from it. The token is both your auth credential and the
permission scope — keep it in every request.

```
GET https://<host>/documents/<slug>/state
Authorization: Bearer <token>
```

One call returns everything you need: the document `markdown`, all existing
`marks` (comments), current `revision`, and `mutationReady` status. Read it
**before** doing anything else. If `mutationReady` is `false`, wait a moment and
fetch again (the server is warming up the document; see §5 PROJECTION_STALE).

If the human's message includes an instruction like "help me improve the intro"
or "shorten this paragraph", treat that instruction as a comment task — do not
rewrite silently.

## 2. Never edit directly. Comment first.

The 👍 protocol is non-negotiable. Every change you want to make starts as a
comment the human explicitly approves.

### Add a comment proposing the change

```
POST https://<host>/documents/<slug>/ops?token=<token>
Content-Type: application/json
X-Agent-Id: <your-name>

{
  "type": "comment.add",
  "by": "ai:<your-name>",
  "quote": "<exact substring from the document>",
  "text": "I suggest changing this to: ...\n\nReply 👍 and I'll apply it."
}
```

Requirements for the `quote` field:

- Must be **exact** — same punctuation, same quote marks (`""` vs `「」` vs `''`
  matter), no added or dropped whitespace.
- Must be a **contiguous** substring within a single block (no paragraph
  breaks, no markdown decorators like `**bold**` wrapping).
- 15–80 characters is the sweet spot. Too short → fuzzy matches fail. Too long
  → harder to anchor.

### Wait for 👍

Poll the state endpoint every 10–15 seconds and look at your comment's
`thread` (or `replies`) array. A reply from `human:...` or `user:...` that
contains `👍` means go. A reply with `👎` or a question means propose a
revision, don't apply.

Do **not** make any `/edit/v2` call before you see 👍.

### Apply after 👍

Direct content edits go through the dedicated agent endpoint (not `/ops`).
First refetch `/state` to get fresh `revision` and block `refs`, then:

```
POST https://<host>/api/agent/<slug>/edit/v2
Authorization: Bearer <token>
Content-Type: application/json
X-Agent-Id: <your-name>

{
  "by": "ai:<your-name>",
  "baseRevision": <revision from latest /state>,
  "operations": [
    {
      "op": "replace_block",
      "ref": "<block ref from /state>",
      "block": { "markdown": "<new markdown, one top-level node>" }
    }
  ]
}
```

Supported `op` values for `/edit/v2`:

| op | Required fields | Meaning |
|---|---|---|
| `replace_block` | `ref`, `block.markdown` | Overwrite one block |
| `insert_after` | `ref`, `blocks: [{markdown}, ...]` | Insert after a block |
| `insert_before` | `ref`, `blocks: [{markdown}, ...]` | Insert before a block |
| `delete_block` | `ref` | Remove one block |
| `replace_range` | `fromRef`, `toRef`, `blocks: [...]` | Replace a contiguous range |
| `find_replace_in_block` | `ref`, `find`, `replace`, `occurrence: first\|all` | Text replace inside one block |

Every block's `markdown` must parse into **exactly one** top-level markdown
node. Multi-node content → split into multiple `blocks[]` entries.

If no 👍-approved human edit is needed (e.g. you're just posting a suggestion
for the human to accept), prefer `type: suggestion.add` via `/ops` instead —
the human accepts with `suggestion.accept`, which applies the edit server-side
without you touching `/edit/v2` at all.

Then reply in the comment thread:

```
{ "type": "comment.reply", "markId": "<from comment.add>", "by": "ai:<your-name>", "text": "✓ 已改" }
```

And resolve the comment:

```
{ "type": "comment.resolve", "markId": "<same id>", "by": "ai:<your-name>" }
```

## 3. Scope discipline

- **One 👍 = one edit.** Don't batch three changes under a single comment
  thread. If you have three suggestions, leave three comments.
- **If the human says "you can edit directly", still comment first.** The 👍
  protocol is what makes Zoon trustworthy for everyone else who reads the doc
  later — skipping it breaks the authorship audit trail.
- **Multiple agents can be in the same doc.** Check who wrote each comment
  before replying. Don't answer another agent's thread unless explicitly asked.

## 4. API quick reference

| Action | Method + Path | Notes |
|---|---|---|
| Read state | `GET /documents/<slug>/state` | `Authorization: Bearer <token>` |
| Add comment | `POST /documents/<slug>/ops` | `type: comment.add` |
| Reply in thread | `POST /documents/<slug>/ops` | `type: comment.reply` |
| Resolve comment | `POST /documents/<slug>/ops` | `type: comment.resolve` |
| Unresolve comment | `POST /documents/<slug>/ops` | `type: comment.unresolve` |
| Suggest insert/delete/replace | `POST /documents/<slug>/ops` | `type: suggestion.add`, `kind: insert\|delete\|replace` |
| Accept / reject suggestion | `POST /documents/<slug>/ops` | `type: suggestion.accept` / `suggestion.reject` |
| Apply edit (block-based) | `POST /api/agent/<slug>/edit/v2` | `baseRevision` + `operations[]`; see §2 |
| Apply rewrite | `POST /documents/<slug>/ops` | `type: rewrite.apply` (editor role only) |

**Supported `/ops` `type` values are exactly the rows above.** If you POST any
other value — `comment.remove`, `mark.delete`, `edit`, `edit/v2` to `/ops`,
anything else — you'll get a 400 with an `Unsupported operation` error and a
`supportedOperations[]` list. There is no undo or delete for comments once
posted; resolve them instead.

All ops endpoints also accept `?token=<token>` in the query string if you
can't set headers.

Full API specification: `GET /agent-docs` on the same host.

## 5. Common errors

**`ANCHOR_NOT_FOUND`** — your `quote` doesn't match the doc verbatim. Re-fetch
state, copy the substring byte-for-byte. The usual culprits:

- Typographic quote marks (`""` vs `""`) or Chinese quotes (`「」`)
- Trailing whitespace or newline characters
- Markdown decoration (`**`, `_`, `~~`) inside the quote

**`STALE_REVISION`** — another writer (the human, or a parallel agent) edited
between your read and your write. Re-fetch `/state`, use the new `revision`,
retry once. If it fails again, your change probably conflicts with the new
content — re-read, re-propose.

**`PROJECTION_STALE`** / **`mutationReady: false`** — the document's
collaborative state isn't warm yet. Fetch `/state` once to trigger on-demand
repair, wait 2 seconds, then retry. If it persists past 10 seconds, tell the
human — the server may need attention.

**`RATE_LIMITED`** (429) — you're sending ops too fast. Respect the
`Retry-After` header (usually < 60s) and back off.

## 6. Introducing yourself

On first contact with a new doc, after you've read state, post one comment
introducing yourself — don't edit, don't write in the doc body. Something
short:

```
{
  "type": "comment.add",
  "by": "ai:<your-name>",
  "quote": "<first sentence of the doc>",
  "text": "Hi — I'm <your-name>. I've read the doc. What would you like to work on? I'll propose changes as comments and wait for your 👍 before touching anything."
}
```

Then stop and wait. The human drives; you respond.

## 7. Authorship tagging

You do not need to set authorship manually — the server reads `by: "ai:..."`
from your ops and tags every character you emit as AI-written. The human's
editor renders your text in purple, theirs in green. Do not try to
impersonate a human (`by: "human:..."`) — the server rejects it, and even if
it didn't, it'd break the audit trail that makes Zoon useful.

## 8. When in doubt

- Read the doc before writing.
- Ask in a comment, don't act.
- One 👍 = one edit.
- Tell the human what you see and what you plan — then wait.

The human is always the author of record. You are a collaborator they trust
because the protocol keeps them in control.
