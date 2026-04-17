---
name: zoon
description: Collaborate inside a Zoon document. Read the doc first, leave Ack-gated comment suggestions (the "「拍板」 protocol"), and only apply edits after the human clicks 「拍板」 (or replies with the legacy 👍 emoji). Also: when your own output runs long (plans, specs, design docs), push it as a new Zoon doc so the human can review with color-coded provenance + threaded comments instead of scrolling a terminal. Use plain HTTP — no browser automation needed.
---

# Zoon Agent Skill

Two entry points into this skill:

- **A. Human gave you a Zoon URL** — work inside that doc (§1 onwards)
- **B. Your own output is long** — push it as a new Zoon doc and hand back the URL (§0)

## 0. When your output is long, push it into Zoon

If you're about to drop a 500-line plan, spec, design doc, or analysis into
the terminal, push it into Zoon first. The human will review with
color-coded authorship and threaded comments — much better than scrolling
back through a chat log — and the 「拍板」 loop continues on top of it.

**Use when:** output is > ~200 lines, spans multiple sections, or the human
is likely to want to edit / iterate / archive it.
**Don't use when:** short answer, a code snippet the human wants inline, or
something the human explicitly asked to see in the terminal.

### The call

One HTTP POST. No auth — the endpoint is public (rate-limited per IP).

```
POST https://<zoon-host>/api/public/documents
Content-Type: application/json

{
  "title": "Q2 产品规划",
  "markdown": "# Q2 产品规划\n\n## 目标\n\n本季度核心目标：..."
}
```

Response:

```
{
  "success": true,
  "slug": "abc12345",
  "accessToken": "…",
  "ownerSecret": "…",
  "url": "https://<zoon-host>/d/abc12345?token=…"
}
```

Hand the human **just the `url`** — tokenized, works immediately, no login.
Keep `ownerSecret` in your session if you plan to re-visit later (it unlocks
owner-level operations; never share it with the human in the chat log).

### Constraints

- `markdown`: optional string, UTF-8, ≤ 500 KB. Omit to create a blank doc
  with the default Chinese welcome guide.
- `title`: optional string, ≤ 200 chars. Omit and Zoon auto-derives from the
  first `# heading` in the markdown.
- Rate limit: ≤ 5 creations per IP per minute. On 429 back off using the
  `retry-after` header.

### Which Zoon host?

If the human didn't tell you, ask. There's no hardcoded default — each Zoon
instance is self-hosted. A typical human message is *"push this to my Zoon
at https://zoon.foo.bar"*.

### After the push

Hand over the URL with a one-line cue — example:

> 已把 Q2 规划推到 Zoon：`https://zoon.foo.bar/d/abc12345?token=…`
> 打开后在想改的地方加批注，你点「拍板」我就按协议改。

Then follow §1 — connect to the doc you just created (same URL), wait for
the human's comments, and apply the 「拍板」 protocol for every edit.

> Either entry point: the server tags every character you emit as
> `ai:<your-name>`, so the human sees your writing in purple and theirs in
> green. See §7 for details.

## ⚠️ Before you start

- **There are exactly two endpoints you'll call.** `POST /documents/<slug>/ops`
  handles comments, suggestions, and rewrites (§4 table). `POST /api/agent/<slug>/edit/v2`
  handles direct content edits after 「拍板」. Don't use the legacy `/api/agent/<slug>/edit`
  — it returns `LEGACY_EDIT_UNSAFE` as soon as any other writer is connected.
- **Re-fetch `/state` right before every write.** Revision numbers bump on
  every successful op — yours and everyone else's. Don't cache a revision
  across writes. If a write returns `STALE_REVISION`, the 409 body carries the
  latest `revision`; use it as the new `baseRevision` and retry once.
- **One 「拍板」 = one edit request.** Don't batch three human approvals into one
  `/edit/v2` call. Batching breaks the 「拍板」 audit trail and makes conflicts
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

### Step 1a: announce presence

The human's editor is probably showing an "邀请中…" modal right now, watching
for you to join. Make it flip to the joined state:

```
POST https://<host>/api/agent/<slug>/presence
Authorization: Bearer <token>
X-Agent-Id: <your-name>
Content-Type: application/json

{"agentId":"<your-name>","name":"<display-name>","status":"active"}
```

### Step 1b: read the doc

```
GET https://<host>/documents/<slug>/state
Authorization: Bearer <token>
```

One call returns everything you need: the document `markdown`, all existing
`marks` (comments), current `revision`, and `mutationReady` status. Read it
**before** doing anything else. If `mutationReady` is `false`, wait a moment and
fetch again (the server is warming up the document; see §5 PROJECTION_STALE).

### Step 1c: reply in chat to the human

Once you've joined and read the doc, reply back in chat with the Zoon-flavored
status message from §6. Don't post a comment in the doc just to introduce
yourself — keep the doc body clean.

If the human's message includes an instruction like "help me improve the intro"
or "shorten this paragraph", treat that instruction as a comment task — do not
rewrite silently.

## 2. Never edit directly. Comment first.

The 「拍板协议」 (Ack Protocol) is non-negotiable. Every change you want to make
starts as a comment the human explicitly approves by clicking 「拍板」 (legacy
👍 emoji still recognized).

### Add a comment proposing the change

```
POST https://<host>/documents/<slug>/ops?token=<token>
Content-Type: application/json
X-Agent-Id: <your-name>

{
  "type": "comment.add",
  "by": "ai:<your-name>",
  "quote": "<exact substring from the document>",
  "text": "I suggest changing this to: ...\n\nReply 「拍板」 and I'll apply it."
}
```

Requirements for the `quote` field:

- Must be **exact** — same punctuation, same quote marks (`""` vs `「」` vs `''`
  matter), no added or dropped whitespace.
- Must be a **contiguous** substring within a single block (no paragraph
  breaks, no markdown decorators like `**bold**` wrapping).
- 15–80 characters is the sweet spot. Too short → fuzzy matches fail. Too long
  → harder to anchor.

### Wait for 「拍板」

Poll the state endpoint every 10–15 seconds and look at your comment's
`thread` (or `replies`) array. A reply from `human:...` or `user:...` that
contains `「拍板」` (or the legacy `👍` emoji) means go. A reply with `👎` or a
question means propose a revision, don't apply.

Do **not** make any `/edit/v2` call before you see 「拍板」.

### Apply after 「拍板」

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

If no 「拍板」-approved human edit is needed (e.g. you're just posting a suggestion
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

- **One 「拍板」 = one edit.** Don't batch three changes under a single comment
  thread. If you have three suggestions, leave three comments.
- **If the human says "you can edit directly", still comment first.** The 「拍板」
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

After §1 (presence + read state), reply to the human **in chat** (not as a
doc comment) with a short status so they know you're in and oriented. Don't
introduce yourself by writing in the doc body.

**Template — adapt the content, keep the shape:**

```
⏺ 已加入 Zoon 文档，ready.

文档 <slug>，presence 已宣布。快速扫了一眼，这篇在讲 <一句话主题>。
<如果有未解决的 comment 或 flagged 标记，列出 1-2 条；没有就省略这一行>

Zoon 规则我清楚：
- 你写绿色，我写紫色
- 我不动文档，只提批注；你点「拍板」才落文档

现在我能帮你做：
1) <具体建议 1，基于文档内容>
2) <具体建议 2>
3) <具体建议 3>

你挑一个方向，或者直接告诉我要改什么。
```

Rules for the template:

- The `⏺ 已加入 Zoon 文档，ready.` opening line is intentional — the human's
  `邀请中…` modal keys off your presence POST, not this message, but the line
  makes the handoff feel deliberate. Keep it.
- The **one-line topic summary** must come from actually reading the doc, not
  from the URL or the doc title. If you can't summarize, say so honestly.
- The **three concrete suggestions** must be specific to the doc content
  (never "I can help with writing / grammar / structure" — that's filler).
  Examples: *"把第二段的目标拆成可度量数字"*, *"给『风险』那一节再补两条"*,
  *"把整篇收到 800 字以内"*.
- No edits, no comments, no suggestions. Stop and wait for the human to pick.

This is the chat handoff. The 「拍板协议」 kicks in afterwards — §2 onward.

### Leaving cleanly

When you're done with a session (human says "bye", you've finished the task,
or the conversation is ending), explicitly drop presence so the human sees you
leave the doc:

```
POST https://<host>/api/agent/<slug>/presence/disconnect
Authorization: Bearer <token>
Content-Type: application/json

{"agentId":"<your-name>"}
```

Don't skip this — stale "ghost" presence makes the human think you're still
there and blocks certain edit paths (see `LEGACY_EDIT_UNSAFE` in §5-ish
territory). Presence also auto-expires after ~60s of silence, but an
explicit disconnect is cleaner.

## 7. Authorship tagging

You do not need to set authorship manually — the server reads `by: "ai:..."`
from your ops and tags every character you emit as AI-written. The human's
editor renders your text in purple, theirs in green. Do not try to
impersonate a human (`by: "human:..."`) — the server rejects it, and even if
it didn't, it'd break the audit trail that makes Zoon useful.

## 8. When in doubt

- Read the doc before writing.
- Ask in a comment, don't act.
- One 「拍板」 = one edit.
- Tell the human what you see and what you plan — then wait.

The human is always the author of record. You are a collaborator they trust
because the protocol keeps them in control.
