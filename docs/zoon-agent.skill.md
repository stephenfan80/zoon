---
name: zoon
description: Collaborate inside a Zoon document. Read the doc first. Default mutation path for content you produce (new paragraphs, sections, rewrites, structural reorgs) is direct write via `POST /api/agent/<slug>/edit/v2` — your writes show up in purple so humans see exactly what you added and can click any span to revise or delete it. Keep the comment + 「拍板」 flow for (a) small surgical edits to the author's 原文, (b) cases where you're unsure which direction the human wants, (c) pure discussion / clarification / flagging. Also — top-priority rule: before producing plan-grade output (plans, specs, design docs, articles, multi-section analyses), STOP and ask the human whether to write it into a new Zoon doc or answer in chat. Don't dump long structured content into the terminal by default. Use plain HTTP — no browser automation needed.
---

# Zoon Agent Skill

Three entry points into this skill:

- **A. Human gave you a Zoon URL** — work inside that doc (§1 onwards)
- **B. You're about to produce plan-grade output** — ask first, then push a new Zoon doc (§0)
- **C. Human just pointed you at this skill with no doc and no task yet**
  (typical: they pasted the 「复制给 Agent」 prompt from a Zoon homepage)
  — greet them in plain language first (§First-contact below), then wait for
  A or B to trigger.

## First contact — two short sentences, then stop

> **When this applies:** Entry point C above. The human just loaded you into
> this skill via a copy-prompt. They do not have a doc yet. They do not have
> a task yet. They are waiting for *you* to tell them what this is.

Reply in the **human's language** (if the copy-prompt was in Chinese, reply
in Chinese) with **exactly two short sentences**:

1. **Confirm you joined and are ready.**
2. **One line on what you can do in Zoon generically** — read any doc they
   send you, and write new content directly into the body (shown purple for
   AI-authored, so the human can click any span to revise or delete).

Then **stop.** Don't fetch anything, don't create any doc, don't pre-read
a doc the human hasn't shown you yet, don't list 2–3 suggestions, don't ask
about long-output preferences, don't recite the protocol, don't list API
endpoints, don't pitch comments / 「拍板」 here (that's a fallback path for
small edits — covered in §2.B, not an onboarding pitch). Wait for the human
to send a Zoon link or tell you what to work on.

### Session-level preference for plan-grade output

The human can steer §0's "推 Zoon 还是 chat" behavior at any time by saying
so in plain language. You don't ask for this up front anymore — you listen
for it and adjust.

- **Default (no signal yet) — B "每次问"**: §0's per-plan ask stays on.
  Before each plan-grade output, ask *"推到 Zoon，还是在这里直接写？"*
  as §0 describes.
- **Human says something like *"以后都直接推 Zoon"* / *"默认推"* / *"长的
  都推"*** → treat as session-level **A**: skip §0's per-plan ask for the
  rest of this session and push straight to Zoon, mentioning it in one chat
  line afterwards (e.g. *"内容较长，我直接推到 Zoon 了：<url>"*). §0's
  stay-in-chat whitelist is unchanged — short answers, one-paragraph
  replies, code snippets, direct diagnostics still live in chat.
- **Human says something like *"都写 chat"* / *"不要推 Zoon"* / *"就在这
  里答"*** → treat as session-level **C**: keep all plan-grade output in
  chat this session, don't ask the "推 Zoon 还是 chat" question each time.
  The ~100-line auto-push rule from §0 relaxes too — if an output is going
  to be really long (say, >200 lines), surface the tradeoff once (*"这段
  会挺长（~X 行），要不要破例推一次 Zoon？"*) but do not override a clear
  *"就写 chat"* answer.
- **Human changes their mind mid-session** ("算了，改成每次问我吧") →
  switch modes and keep going.

### Anti-pattern — what the first reply must NOT look like

> ❌ "已读完 SKILL.md，协议要点记下了：两个端点 `POST /documents/<slug>/ops`
>    与 `POST /api/agent/<slug>/edit/v2`；默认走 /edit/v2 直写，小修走
>    comment + 「拍板」；markdown 每条必须单个 top-level node …
>    发 URL 吧。"

That's a TL;DR for yourself, not for the human. The human doesn't need the
endpoint names — or a preference questionnaire — to start working with you.
Two sentences + stop.

## 0. Before plan-grade output: ask where it should live

> **⚑ Top-priority rule of this skill.** This overrides any default "just
> answer in chat" reflex. Do not skip the ask.

If you're about to produce a **plan, spec, design doc, article, or any
multi-section structured analysis** the human might want to read, edit,
iterate, or archive — **stop and ask before you write a single line of
content**:

> 我这个 [一句话类型 + 范围] 大概 [X 行 / X 节]。
> 推到 Zoon（AI 字紫色显示，你点击任何一段就能改或删），还是在这里直接写？

Wait for the human's pick. Then write it in that surface, not both.

### Routing rules

- **Push to Zoon** (the POST flow below) when:
  - the human picks "推 Zoon" / "写文档" / "开 doc", **or**
  - the output runs over ~100 lines, regardless of kind — even if you
    didn't ask, past 100 lines chat becomes painful to scroll and you
    should push anyway (you can still mention it: *"内容较长，我直接推
    到 Zoon 了"*).
- **Stay in chat** for: one-paragraph answers, code snippets, short
  diagnostics, direct replies to a specific question, quick clarifications.
  **Don't ask before these** — *"要推到 Zoon 吗？"* in front of a 2-line
  answer is noise.
- **Grey zone → ask.** Cheap question, expensive regret: writing 300 lines
  into the wrong surface and then migrating is strictly worse than one
  quick *"哪里写？"*.

### Don't ask twice for the same plan

Once the human picks a surface for a specific plan/article, **stay on that
surface for every follow-up iteration of the same content** (revisions,
expansions, alternate versions). Ask again only when they start a *new*
plan/article.

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
  "url": "https://<zoon-host>/d/abc12345?token=…",
  "agentInviteMessage": "Hi! Inviting you to collaborate on my Zoon doc.\n\nDoc: https://…?token=…\n… (full ready-to-paste invite, token already embedded)"
}
```

Hand the human **just the `url`** — tokenized, works immediately, no login.
Keep `ownerSecret` in your session if you plan to re-visit later (it unlocks
owner-level operations; never share it with the human in the chat log).

### Handing the doc to *another agent* (agent-to-agent handoff)

If the next collaborator is an agent instead of a human, paste the
**`agentInviteMessage`** field from the response as-is. It's the full invite
block — tokenized URL, auth headers with the real `x-share-token` already
substituted, skill pointer, 3-step quick start — nothing to fill in.

**Do not hand-assemble the template yourself.** Earlier bugs came from agents
copying templates from memory and forgetting to substitute
`<token-from-doc-url>`, which left the placeholder literal in the
`x-share-token` line and the next agent hit HTTP 401 on every API call.
`agentInviteMessage` exists precisely so you never have to touch the token.

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
> 整篇是我写的（紫色），点击任何一段就能改或删。小修我没写的地方
> 我会挂批注等你「拍板」。

**Then stop.** Delivering the URL *is* the handoff. Don't proactively add
comments, discussion questions, or "things worth thinking about" into the
doc — the human hasn't asked for your opinion yet, and unsolicited 批注
pollute the 「拍板」 thread with noise the human didn't request.

Open-ended chat phrases like *"聊聊这个"*, *"我们讨论下"*, *"复盘一下"* are
**conversational**, not a comment task. Answer in chat. Do **not** treat
them as the §1 Step 1c *"treat instruction as a comment task"* case — that
rule only applies when the human gives a concrete change request
(*"shorten this paragraph"*, *"rewrite the intro"*).

Enter §1 (join as a collaborator, wait for 「拍板」) only when **either**:

- the human explicitly asks you to participate in the doc (*"你也加几条批注"*
  / *"你在文档里提问"* / *"你来标注一下要改的地方"*), **or**
- the original entry point was A (they gave you a pre-existing Zoon URL).

If in doubt, stay in chat and wait.

> Either entry point: the server tags every character you emit as
> `ai:<your-name>`, so the human sees your writing in purple and theirs in
> green. See §7 for details.

## ⚠️ Before you start

- **There are exactly two endpoints you'll call.** `POST /api/agent/<slug>/edit/v2`
  is the **default** content-mutation endpoint — new paragraphs, new
  sections, rewrites, structural reorgs. `POST /documents/<slug>/ops`
  handles comments, suggestions (for small edits to 原文), accept/reject,
  rewrites (§4 table). Don't use the legacy `/api/agent/<slug>/edit` — it
  returns `LEGACY_EDIT_UNSAFE` as soon as any other writer is connected.
- **Don't `/snapshot` for append / prepend.** `insert_at_end` and
  `insert_at_start` need **no** block `ref` and **no** `baseRevision` —
  just send the markdown. The server auto-rebases on conflict and retries,
  so concurrent writes from multiple agents commute safely. Fetching
  `/snapshot` before an append is a wasted roundtrip.
- **Fetch `/snapshot` only for anchored ops.** `insert_after`,
  `insert_before`, `replace_block`, `delete_block`, `replace_range`,
  `find_replace_in_block` all need a block `ref`, and `ref`s only live in
  `/snapshot` (not `/state`). Fetch once right before the write — you get
  fresh `revision`, block `ref`s, and per-block `markdown` in one call.
  If a write returns `STALE_REVISION`, the 409 body carries the latest
  `revision`; use it as the new `baseRevision` and retry once — **don't
  re-fetch `/snapshot`**.
- **On the §2.B small-edit path, one 「拍板」 = one edit request.** When the
  human explicitly approves a specific suggestion, apply *that* suggestion
  only — don't batch three 拍板 approvals into one `/edit/v2` call, that
  breaks the audit trail. Direct-write `/edit/v2` calls for new content
  (§2.A) can and should bundle related operations into one call.
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

### Step 1b: read the doc — only when the human gives you a task

Don't read the doc during onboarding. **Read it on-demand**, when the human
gives you a task that actually requires the doc's current content or its
existing comment threads.

**Endpoint cheat sheet — pick by what you actually need:**

| You need | Endpoint | Field(s) |
|---|---|---|
| Nothing — you just want to append / prepend | **no fetch**, go straight to `POST /edit/v2` with `insert_at_end` / `insert_at_start` | — |
| Block `ref`s + per-block `markdown` (required for *anchored* `/edit/v2` ops only) | `GET /api/agent/<slug>/snapshot` | `blocks[].ref`, `blocks[].markdown` |
| The whole doc as one linear `markdown` string (skim / quote for a prompt) | `GET /documents/<slug>/state` | `markdown` |
| Existing comments / suggestion threads | `GET /documents/<slug>/state` | `marks` |
| Fresh `revision` for `baseRevision` on an anchored op | `GET /api/agent/<slug>/snapshot` | `revision` |

`/state` has no `blocks[]` array and no block `ref`s — do **not** try to
pull refs out of it. Going to `/state` first and then `/snapshot` when you
realize refs live there is a 3–4-call detour on every write; `/snapshot`
alone is usually enough.

Auth (same for both):

```
Authorization: Bearer <token>
```

If `mutationReady` is `false` on either response, wait a moment and fetch
again (the server is warming up the document; see §5 PROJECTION_STALE).

**Route by task shape:**

- Task is *"在文末加一段 / 在开头加一段"* (append / prepend) → **no fetch
  needed**. Use `insert_at_end` / `insert_at_start` (§2.A) with just the
  markdown — no block `ref`, no `baseRevision`. The server auto-rebases and
  retries, so concurrent writes from multiple agents commute safely.
- Task is *"在 X 段后面插一段 / 重写第三段 / 删掉这段"* (§2.A direct write,
  anchored) → `GET /snapshot` once. You get block `ref`s and `revision` in
  one call so you can pick the anchor. Don't pre-fetch `/state`.
- Task is *"改一下第二段那个词 / 这句话"* (§2.B small surgical edit) →
  `GET /state` so you can quote the exact `originalText` for the comment
  anchor.
- Task is *"看看我留的批注，回我几条"* → `GET /state` for the `marks`
  array.
- Pure chat / discussion / "先聊聊你的想法" → no fetch needed.

### Step 1c: pick the right surface for each reply

Once you've joined and read the doc, you need to decide **where** each piece of
output goes. Zoon has two surfaces, and using the wrong one creates duplication
the human then has to ask you to fix.

> **One-liner: Chat is for handoff signals; the doc is for discussion.**

Route by what the human's message is asking for:

- **The human already left comments in the doc asking for your take** → reply
  in those threads with `comment.reply`. That's where the discussion lives; do
  not also summarize your replies in chat. The chat handoff is just *"已在
  Zoon 回复 3 条批注，等你拍板或回复"* — one line, no duplication of the
  thread content.
- **You want to propose a change to the doc body** → `comment.add` on the
  quoted span and run the §2 proposal protocol (ends in 「拍板」).
- **You want to ask a clarifier or confirm your understanding of the human's
  annotation** → `comment.reply` (or a bare `comment.add` without "I
  suggest..." wording). This is discussion, not a proposal — don't attach a
  「拍板」 ask to it.
- **Delivery / handoff / status signals** → chat. *"我已读完文档，先在 3
  条批注下回复了，拍板后我再改"* belongs in chat; the thread-by-thread
  content belongs in the doc.

If the human's message includes a concrete change request like *"help me
improve the intro"* or *"shorten this paragraph"*, route it through the
right mutation path (§1d below) — don't rewrite silently and don't write
a long "here's what I'd change" chat reply instead of actually mutating
the doc.

### Step 1d: direct write vs. comment-and-「拍板」

Inside the doc, you have two mutation paths. Pick by **whose text you're
touching and how big the change is**:

- **New content you're producing** (new paragraphs, new sections, rewrites
  of AI-authored blocks, structural reorgs, "shorten this paragraph" when
  *this paragraph* is AI-authored) → **direct write via
  `POST /api/agent/<slug>/edit/v2`** (see §2 "Direct write path"). Your
  writes are auto-tagged `ai:<you>` and rendered purple, so the human
  sees exactly what you added inline and can click any purple span to
  revise or delete. Leave a one-line chat summary afterwards so they
  know to look.
- **Small surgical edits to the human's 原文** (change a word, tighten
  one sentence, adjust tone on a human-written paragraph) → **comment
  + 「拍板」** via `POST /documents/<slug>/ops` `type: suggestion.add`
  (see §2 "Comment + 「拍板」 path"). Inline suggestion is faster for the
  human to审 than "see purple, then delete, then retype in their
  voice".
- **Unsure which direction the human wants** → `comment.add` with a
  question first, write after they answer. Don't guess.
- **Pure discussion / clarification / flag** → `comment.add` (that's
  literally what this endpoint is for; no 「拍板」 needed — §2 covers
  this too).

**Why the split.** Zoon's differentiation isn't "AI needs human approval
for every word". It's **AI-authored text and human-authored text are
always visually distinguishable (purple vs green), and the human always
has revert authority**. Agent's path should be the shortest — write,
tell the human, wait for feedback — not an approval gate before every
write. The 「拍板」 protocol stays for small edits to the author's 原文,
where purple-tag-then-revise would cost the human more than the
review itself.

## 2. Mutation paths — direct write and comment + 「拍板」

The two paths from §1d, concretely. Pick one per mutation. Don't post a
draft in a comment and *also* direct-write it — the human will see the
same content twice.

### 2.A Direct write path (default for new content)

**Use this for:** new paragraphs / sections, rewrites of AI-authored
blocks, structural reorgs, "shorten this paragraph" when *this paragraph*
is AI-authored.

#### Append / prepend — no fetch needed

If the task is "加在文末" or "加在开头", use `insert_at_end` /
`insert_at_start`. No `/snapshot` call, no `baseRevision`, no block
`ref` — just the markdown. The server parses multi-block markdown for
you and auto-rebases on conflict, so two agents appending at the same
time both succeed.

```
POST https://<host>/api/agent/<slug>/edit/v2
Authorization: Bearer <token>
Content-Type: application/json
X-Agent-Id: <your-name>

{
  "by": "ai:<your-name>",
  "operations": [
    {
      "op": "insert_at_end",
      "markdown": "## 金句精选\n\n- 第一句\n- 第二句"
    }
  ]
}
```

The `markdown` field can contain one block or many — headings, paragraphs,
lists, quotes are all fine in one string, separated by blank lines. Cap:
50 KB per op; oversized payloads come back as `400 MARKDOWN_TOO_LARGE`
with `sizeBytes` and `maxBytes` so you can split and retry. Empty /
whitespace-only markdown comes back as `400 EMPTY_MARKDOWN` with a
`userHint` — relay that to the user verbatim ("I got an empty draft,
what did you want me to write?") instead of silently retrying.

#### Anchored inserts and edits — `/snapshot` first

For "在 X 段后面插一段" / "重写第三段" / "删掉这段" / range replace, you
need a block `ref`. Refetch `GET /api/agent/<slug>/snapshot` right before
the write — one call gives you fresh `revision`, block `ref`s, and
per-block `markdown`. (Don't go to `/state` for this — `/state` has no
block list. See §1b cheat sheet.) Then:

```
POST https://<host>/api/agent/<slug>/edit/v2
Authorization: Bearer <token>
Content-Type: application/json
X-Agent-Id: <your-name>

{
  "by": "ai:<your-name>",
  "baseRevision": <revision from latest /snapshot>,
  "operations": [
    {
      "op": "insert_after",
      "ref": "<block ref from /snapshot>",
      "blocks": [
        { "markdown": "## Section title" },
        { "markdown": "Paragraph one." },
        { "markdown": "Paragraph two." }
      ]
    }
  ]
}
```

Supported `op` values for `/edit/v2`:

| op | Required fields | Meaning |
|---|---|---|
| `insert_at_end` | `markdown` (one or many blocks) | Append to end of doc (no ref, no baseRevision) |
| `insert_at_start` | `markdown` (one or many blocks) | Prepend to start of doc (no ref, no baseRevision) |
| `insert_after` | `ref`, `blocks: [{markdown}, ...]` | Insert after a block |
| `insert_before` | `ref`, `blocks: [{markdown}, ...]` | Insert before a block |
| `replace_block` | `ref`, `block.markdown` | Overwrite one block |
| `delete_block` | `ref` | Remove one block |
| `replace_range` | `fromRef`, `toRef`, `blocks: [...]` | Replace a contiguous range |
| `find_replace_in_block` | `ref`, `find`, `replace`, `occurrence: first\|all` | Text replace inside one block |

For the anchored ops (`insert_after` etc.), every block's `markdown`
must parse into **exactly one** top-level markdown node. Multi-node
content → split into multiple `blocks[]` entries. The boundary ops
(`insert_at_end` / `insert_at_start`) relax this — they take one
`markdown` string that can contain multiple blocks. (See "Before you
start" §4 rule about blank lines.)

#### Chain writes: reuse the response `snapshot`, don't re-read

Every successful `/edit/v2` response already contains a complete
`snapshot` of the doc **after** your write — same shape as
`GET /snapshot`. If the task needs more than one write (e.g. "重写第 3
段 + 在第 5 段后加两段 + 删掉第 8 段"), use the response `snapshot`
as the input to your next op. Do **not** fetch `/snapshot` again between
writes — that's a wasted roundtrip and (worse) introduces a window
where a human or parallel agent could edit between your reads and your
next write.

Response shape:

```
{
  "success": true,
  "snapshot": {
    "revision": 42,
    "blocks": [
      { "ref": "b1", "id": "...", "type": "heading", "markdown": "# Title" },
      { "ref": "b2", "id": "...", "type": "paragraph", "markdown": "…" },
      …
    ],
    "mutationBase": { "token": "<opaque>", … }
  },
  …
}
```

For the next anchored op, plug `snapshot.revision` into `baseRevision`
and pick your anchor from `snapshot.blocks[*].ref`. Boundary ops
(`insert_at_end` / `insert_at_start`) don't need either — just fire.

**Prefer one request with multiple `operations` when possible.** If you
already know all the ops upfront (e.g. you planned the whole rewrite
after reading `/snapshot` once), batch them into a single `/edit/v2`
call with `operations: [...]`. Only chain across multiple requests when
later ops genuinely depend on the text the earlier ops produced.

**After the write, leave a one-line chat summary** so the human knows to
look:

> "我在文末加了『访谈金句精选』一节，4 组共 12 条；前面两段的导语也
> 收紧了一句。"

No 拍板 round-trip. Your writes are auto-tagged `ai:<you>` and show up
purple. If the human doesn't like a segment, they click it and edit or
delete directly.

### 2.B Comment + 「拍板」 path (small edits to the human's 原文, plus discussion)

**Use this for:** single-word changes, tone tweaks, sentence-level
rewrites *on text the human wrote*. Also for clarifying questions,
discussion replies, and fact-flagging — those last three don't use 拍板,
they're just comments (see the "Kind" table below).

Not every comment you post is a pending edit. Before writing, decide
which kind you're posting — the protocol is different.

| Kind | When | API | Needs 「拍板」? |
|---|---|---|---|
| **Change proposal on human-authored 原文** | You want one word / phrase / sentence of the human's text changed | `comment.add` / `suggestion.add` on a quoted span | **Yes** — follow the Ack protocol below |
| **Discussion / reply / clarifier** | Replying to the human's existing annotation, asking for intent, confirming understanding, answering their question | `comment.reply` (or a bare `comment.add` without an "I suggest…" ask) | **No** — it's a conversation, not a pending edit |

**Rule of thumb:** if you're proposing to change text *the human wrote*,
it's this path (comment + 拍板). If you're writing new content, go §2.A.
Replies in a thread that don't change the doc are discussion — answer
freely.

#### Add a comment proposing the change

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

#### Wait for 「拍板」

Poll the state endpoint every 10–15 seconds and look at your comment's
`thread` (or `replies`) array. A reply from `human:...` or `user:...` that
contains `「拍板」` (or the legacy `👍` emoji) means go. A reply with `👎` or a
question means propose a revision, don't apply.

Do **not** make any `/edit/v2` call on *this* anchor before you see
「拍板」. (New-content writes on other parts of the doc still go through
§2.A whenever they come up.)

#### Apply after 「拍板」

Use the same `/edit/v2` endpoint and op list from §2.A. For a typical
小修, `find_replace_in_block` or `replace_block` is the natural fit:

```
{
  "op": "find_replace_in_block",
  "ref": "<block ref from /snapshot>",
  "find": "<exact original text>",
  "replace": "<new text>",
  "occurrence": "first"
}
```

If you'd rather the human apply the edit without touching `/edit/v2`,
post `type: suggestion.add` instead of `comment.add` in the request
above — then the human accepts with `suggestion.accept` and the server
applies the edit for you.

Then reply in the comment thread:

```
{ "type": "comment.reply", "markId": "<from comment.add>", "by": "ai:<your-name>", "text": "✓ 已改" }
```

And resolve the comment:

```
{ "type": "comment.resolve", "markId": "<same id>", "by": "ai:<your-name>" }
```

## 3. Scope discipline

- **One 「拍板」 = one small edit.** When you *are* on the §2.B comment
  path, don't batch three changes under a single comment thread. If you
  have three suggestions for 原文, leave three comments.
- **When you write new content directly (§2.A), commit it as a bounded
  set of `operations[]` for a single coherent change, not a grab-bag
  across unrelated sections.** Each `/edit/v2` call should be one
  idea the human can evaluate and, if needed, revert as a unit.
- **Use the right path for the right text.** New content → §2.A direct
  write. Small edits to the human's 原文 → §2.B comment + 「拍板」. Both
  paths leave AI authorship tagged in purple, so the audit trail is
  preserved either way.
- **Multiple agents can be in the same doc.** Check who wrote each
  comment before replying. Don't answer another agent's thread unless
  explicitly asked. Don't direct-write over another agent's content
  without asking first.

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
between your read and your write. This only happens on **anchored** ops
(`insert_after`, `replace_block`, etc.); `insert_at_end` / `insert_at_start`
auto-rebase server-side and never surface this error. When you do hit it on
an anchored op, the 409 body carries the latest `revision` — use it as the
new `baseRevision` and retry once. **Don't re-fetch `/snapshot` or `/state`**;
the response already has what you need. If the retry also fails, your anchor
`ref` probably points at a block that was deleted or replaced — *that's* when
you re-fetch `/snapshot` and re-plan.

**`PROJECTION_STALE`** / **`mutationReady: false`** — the document's
collaborative state isn't warm yet. Fetch `/state` once to trigger on-demand
repair, wait 2 seconds, then retry. If it persists past 10 seconds, tell the
human — the server may need attention.

**`RATE_LIMITED`** (429) — you're sending ops too fast. Respect the
`Retry-After` header (usually < 60s) and back off.

## 6. Introducing yourself

After POSTing presence (§1a), reply to the human **in chat** (not as a doc
comment) with a **two-line** status so they know you're in and ready. Don't
introduce yourself by writing in the doc body.

**Template — keep it to two lines:**

```
⏺ 已加入 <slug>，可以开始协作了。

我能帮你读这篇、或者直接把新内容写进正文（紫色 = AI 作者，你点击就能改或删）——告诉我要做什么方向就行。
```

Rules for the template:

- The `⏺ 已加入 <slug>，可以开始协作了。` opening line is intentional —
  the human's `邀请中…` modal keys off your presence POST, not this message,
  but the line makes the handoff feel deliberate. Keep it.
- Line 2 is the **generic capability pitch, aligned with §First contact**:
  read the doc + write new content directly (purple, click-to-revise). Do
  **not** pitch comments / 「拍板」 here — that's a §2.B fallback for small
  surgical edits to the human's 原文, not the onboarding pitch.
- **Don't** pre-read the doc before sending this. **Don't** include a topic
  summary. **Don't** list 2–3 doc-specific suggestions. **Don't** enumerate
  existing comments or flagged marks. All of that is pre-task work — wait
  for the human to give you a task, then §1b tells you what to fetch.
- No edits, no comments, no suggestions. Stop and wait for the human.

This is the chat handoff. The §2 mutation rules (direct write for new
content; comment + 「拍板」 as a fallback for small edits to 原文) kick in
only after the human gives you a task.

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
- New content → write directly (§2.A); your purple tag is the audit
  trail, and a one-line chat summary tells the human where to look.
- Small edit to the human's 原文 → comment + 「拍板」 (§2.B); ask first
  if you're not sure what they want.
- Tell the human what you did (or what you plan, if asking first) —
  then wait.

The human is always the author of record. You are a collaborator they
trust because **AI writing is always visually distinguishable (purple
vs green) and they always have revert authority** on anything you write.
