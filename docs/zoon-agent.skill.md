---
name: zoon
description: Use when a user wants an agent-generated Markdown draft to become a collaborative Zoon document, asks to continue editing a plan/spec/report/article in Zoon, shares a Zoon document URL like `https://<host>/d/<slug>?token=<token>`, pastes a Zoon agent invite containing `Doc:`, asks to write into Zoon, push content to Zoon, or collaborate in an online document. Collaborate in Zoon docs over plain HTTP; one document URL is the human page, agent read entry, and agent write entry.
---

# Zoon
Zoon turns long agent Markdown output into a collaborative document workspace
where humans and agents keep editing the same artifact.
Use HTTP for document reads and writes. Do not automate the editor DOM for
mutations.

Codex browser handoff: when the Zoon Codex plugin is installed and you create a
Zoon doc, or the user provides/copies a Zoon agent invite with a `Doc:` URL, use
the `zoon-open-doc` skill to open that document as a Zoon workspace in the Codex
Browser for review, selection, comments, and visible human interaction. If the browser tool chain is unavailable, show the Zoon URL
in chat and tell the user they can right-click the Zoon document URL and choose
`在 Codex 浏览器中打开` / `Open in Codex Browser`. Browser opening is only for
review and human interaction; keep document mutations on the HTTP routes below.

## Trigger Behavior
Use this skill when:
- The user shares a Zoon URL shaped like `https://<host>/d/<slug>?token=<token>`.
- The user says they want content written into Zoon, pushed to Zoon, placed in an online document, or handled as a collaborative doc.
- The user wants to keep editing an agent-generated Markdown artifact such as a plan, spec, report, article, PRD, or multi-section analysis.
- You are about to produce plan-grade output that may need selection, comments, suggestions, or later revisions.

For short answers, quick diagnostics, brief clarifications, and small code snippets, stay in chat unless the user explicitly asks for Zoon.

## Plan-Grade Output Routing
Before writing a long structured response, ask:

> 用 Zoon 继续改，还是在这里直接写？

If the user chooses Zoon and no destination doc is set, create a new doc with
`POST /documents` and share only the tokenized `tokenUrl` from the response
(`url` and `shareUrl` are also tokenized on current deployments; never share
`viewUrl`/`viewPath` as an agent handoff because those are clean human view
links without the collaboration token). If running in Codex with the Zoon plugin
installed, use `zoon-open-doc` on that `tokenUrl`; otherwise tell the user they
can right-click that `tokenUrl` and choose `在 Codex 浏览器中打开` /
`Open in Codex Browser`. If the user provides an existing Zoon URL, read a
snapshot and append the output after the last block with `insert_after`.

## Shortcut Trigger: `/zoon`
When the user sends `/zoon` as a standalone message, switch this conversation
into "turn plan-grade Markdown output into Zoon documents by default" mode.

Reply with:

> 好，之后 plan-grade 的输出我帮你放到 Zoon 里继续协作。
>
> A) 新建一个 doc
> B) 贴到已有 doc（发我带 token 的 URL，例如 `<host>/d/<slug>?token=<...>`）

Then wait. Do not create an empty doc. If the user picks A, create the doc only
when there is real plan-grade content to write. If the user picks B, parse the
`host`, `slug`, and `token` from the URL. If parsing fails, ask once for a valid
`<host>/d/<slug>?token=<...>` URL and do not guess.

## Core Rules
1. A Zoon URL looks like `https://<host>/d/<slug>?token=<token>`.
2. The same URL opens the editor for humans and returns data for agents.
3. Use the token as `Authorization: Bearer <token>`; `x-share-token` also works.
4. Every write includes `by: "ai:<agent-name>"`; `/edit/v2` rejects missing, blank, or non-`ai:` authors before applying changes.
5. Presence and mutations should include `X-Agent-Id: <agent-name>`.
6. Default to direct edits: use `/edit/v2` for direct content edits; Zoon does not force edits over human text into approval.
7. Suggestions are opt-in; use `/ops` for comments, reviewable suggestions, rewrites, and discussion
   thread actions.
8. `suggestion.add` defaults to pending; include `status:"accepted"` to create
   and apply a suggestion in one call.

## Read From The Shared URL
```bash
curl -H "Accept: application/json" "$DOC_URL"
curl -H "Accept: text/markdown" "$DOC_URL"
```
`application/json` returns markdown, revision, marks, auth hints, and links; `text/markdown` returns only markdown; `text/html` opens the editor.

## Canonical Routes
```text
POST /documents
GET /documents/:slug/state | GET /documents/:slug/snapshot
POST /documents/:slug/edit/v2 | POST /documents/:slug/ops
POST /documents/:slug/presence | GET /documents/:slug/events/pending | POST /documents/:slug/events/ack
```

Compatibility routes under `/api/agent/:slug/*` still work, but prefer `/documents/:slug/*`.

## Presence
`POST /documents/$SLUG/presence` with `{ "agentId": "codex", "name": "Codex", "status": "active" }`.

## Read State Or Snapshot
```bash
curl -H "Authorization: Bearer $TOKEN" "$ORIGIN/documents/$SLUG/state"
curl -H "Authorization: Bearer $TOKEN" "$ORIGIN/documents/$SLUG/snapshot"
```

Use `state` for markdown, marks, revision, mutation base, and links.
Use `snapshot` when you need block refs for anchored edits.

## Collaboration Flow: Comment Or `@zoon` Task
When a human comment asks you to rewrite the commented text, use the same
editing rules as any other content task:

1. Read `state` or `snapshot`.
2. Use `edit/v2` for direct block edits when you are applying the change.
3. Use `suggestion.add` when you intentionally want a reviewable proposal.
4. Use `comment.reply` when you need to answer the discussion thread.

```json
{ "type": "comment.reply", "by": "ai:codex", "markId": "m123", "text": "已处理。" }
```
```json
{
  "type": "suggestion.add",
  "by": "ai:codex",
  "kind": "replace",
  "quote": "old text",
  "content": "new text"
}
```

## Direct Write (Explicit Only)
Anchored edit after `GET /snapshot`:
```json
{ "by": "ai:codex", "baseRevision": 42, "operations": [
  { "op": "replace_block", "ref": "b3", "block": { "markdown": "Rewritten paragraph." } }
] }
```

`edit/v2` ops:
- `insert_after`, `insert_before`
- `replace_block`, `delete_block`, `replace_range`
- `find_replace_in_block`

Each `block.markdown` must be one top-level markdown node.
`replace_block`, `delete_block`, and `replace_range` apply directly when their
revision/base preconditions pass.

## Comments And Suggestions
Use `/ops` for discussion and reviewable changes:
```json
{ "type": "comment.add", "by": "ai:codex", "quote": "anchor text", "text": "Question or note." }
```
```json
{ "type": "suggestion.add", "by": "ai:codex", "kind": "replace", "quote": "old text", "content": "new text" }
```

Suggestions are pending by default. Add `status:"accepted"` when you want to
create and immediately apply a suggestion in one call.

## Events
Poll `GET /documents/$SLUG/events/pending?after=<id>` and ack with `POST /documents/$SLUG/events/ack` body `{ "upTo": 123 }`.

## Create And Install
`POST /documents` body `{ "markdown": "# Draft\n\nStart here.", "title": "Draft" }`, then install:

```bash
mkdir -p ~/.codex/skills/zoon && curl -fsSL "$ORIGIN/skill" -o ~/.codex/skills/zoon/SKILL.md
```
