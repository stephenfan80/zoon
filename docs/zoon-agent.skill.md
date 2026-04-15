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

Do **not** make any `edit/v2` call before you see 👍.

### Apply after 👍

```
POST https://<host>/documents/<slug>/ops?token=<token>
Content-Type: application/json
X-Agent-Id: <your-name>

{
  "type": "edit/v2",
  "by": "ai:<your-name>",
  "baseRevision": <revision from latest /state>,
  "operations": [
    { "op": "replace", "quote": "<exact original>", "content": "<your revision>" }
  ]
}
```

Then reply in the comment thread:

```
{ "type": "comment.reply", "markId": "<from comment.add>", "by": "ai:<your-name>", "text": "✓ 已改" }
```

And resolve the mark:

```
{ "type": "mark.resolve", "markId": "<same id>", "by": "ai:<your-name>" }
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
| Resolve mark | `POST /documents/<slug>/ops` | `type: mark.resolve` |
| Apply edit | `POST /documents/<slug>/ops` | `type: edit/v2` + `baseRevision` |

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
