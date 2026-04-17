# Design · Proof Removal + Zoon Skill Package

**Date:** 2026-04-17
**Owner:** stephenfan
**Status:** Draft · awaiting user review

## Goals

1. Remove user-visible references that disclose Zoon was forked from the Proof SDK open-source project. Internal code identifiers stay.
2. Publish a standalone `zoon-skill` GitHub repo so colleagues using Claude Code or Codex can install Zoon as an agent-usable skill via a single command/URL.

## Non-goals

- Renaming internal code identifiers (`proof-marks`, `proofAuthored` mark, `packages/proof-*`, test filenames, SQL column names, `proof-share.db`). Out of scope — high risk, low user value.
- Re-licensing or removing the existing `LICENSE` file (MIT).
- Changing the runtime agent protocol served at `/skill`. The protocol already works; the skill repo just redistributes it.

---

## Task 1 · Scrub user-visible Proof references (scope A)

### Files to modify

| File | Change |
|---|---|
| `README.md` | Delete the `## Credits` section entirely. |
| `src/index.html` | Replace all ~23 Proof mentions (title, meta tags, og:title, og:image URL, any visible string) with Zoon equivalents. |
| `AGENT_CONTRACT.md` | Replace 6 mentions of Proof with Zoon. |
| `docs/agent-docs.md` | Replace 11 mentions of Proof with Zoon. |
| `docs/welcome-zh.md` | Replace 1 mention of Proof with Zoon. |
| `docs/adr/2026-03-proof-sdk-public-core.md` | Rewrite as a neutral architecture decision record titled "Agent-native collaborative markdown editor: core architecture" — cover the decisions (provenance tracking, agent HTTP bridge, thumbs-up protocol) without referencing the Proof fork lineage. |
| `docs/conversation-zoon-analysis-2026-04-02.md` | Audit first — if it narrates fork history, delete; if it's technical analysis, keep after scrubbing Proof name. |
| `public/assets/proof-logo.svg` | Replace with a new `zoon-logo.svg` (SVG wordmark; see Logo section). Delete the old file. |
| `public/assets/proof-logo-animation-v2.lottie` | Delete. Replace any reference with a static `zoon-logo.svg` or remove the animation entry point. |
| `public/assets/og-share/proof-logo-outlined.svg` | Replace with `zoon-logo-outlined.svg`. |
| Any code referencing the old asset paths (grep `proof-logo`, `proof-logo-animation`) | Update path strings. |
| `src/ui/agent-input-dialog.ts`, `agent-presence.ts`, `context-menu.ts`, `review-menu.ts`, `name-prompt.ts`, `theme-picker.ts`, `agent-identity-icon.ts`, `review-progress.ts` | Replace **only** string literals that render to the DOM or screen readers: modal body text, tooltips, `aria-label`, button labels, placeholder text, toast messages. Do NOT touch: variable/function names, class/id selectors referenced from CSS or other TS modules, `console.log`/`console.warn` messages (invisible to end users), or HTML comments used as code markers. |
| `server/homepage-script.ts`, `share-web-routes.ts`, `public-entry-routes.ts` | Replace user-visible strings (served HTML, meta tags). Keep internal identifiers. |

### Files to leave alone

- All `src/tests/*` (test names reference internal semantics, invisible to end users).
- All `packages/proof-*/`, `server/proof-*.ts`, `src/editor/schema/proof-marks.ts`, `src/agent/tools/proof-tools.ts` (internal).
- `apps/proof-example/` (not shipped to end users).
- `proof-share.db` (server-internal file path; not visible).

### Logo

Replace the Proof logo with a simple SVG wordmark:

- Wordmark text: `zoon` (lowercase, geometric sans-serif — system font stack or inline `<tspan>`).
- Two-color accent matching the app's provenance palette: the first `o` filled in **green** (`#16A34A`, human), the second `o` filled in **purple** (`#8B5CF6`, AI). Remaining letters neutral (`#111`).
- Solid 32×32 square version for favicon / og:image fallback.
- All text, no raster imagery, fully inline — any future redesign can swap it.

Assets produced:
- `public/assets/zoon-logo.svg` — full wordmark (replaces `proof-logo.svg`)
- `public/assets/og-share/zoon-logo-outlined.svg` — outlined variant for og:share card (replaces `proof-logo-outlined.svg`)
- `public/assets/proof-logo-animation-v2.lottie` is **deleted, not replaced**. Any call site that renders it falls back to the static SVG wordmark; remove the lottie runtime include (`lottie.min.js`) if no other consumer exists.

### Verification plan

1. After changes, run:
   ```
   grep -riE "proof" README.md src/index.html AGENT_CONTRACT.md docs/ public/assets/ src/ui/ server/homepage-script.ts server/share-web-routes.ts server/public-entry-routes.ts
   ```
   Must return zero hits (expected whitelist is empty for these paths — no internal identifiers live in this subset).
2. `npm run build` passes.
3. `npm run serve`; load the homepage; verify:
   - Page `<title>` reads Zoon.
   - Social-share meta tags (`og:*`, `twitter:*`) reference Zoon + the new logo URL.
   - Create-document flow shows no Proof text in dialogs/tooltips.
   - Favicon and og:image load without 404.

---

## Task 2 · `zoon-skill` GitHub repo

### Repository

- Name: `zoon-skill` (user-confirmed).
- Owner: `stephenfan` (assumption — confirm during implementation).
- License: MIT (same as parent project).
- Visibility: public.

### Directory layout

```
zoon-skill/
├── README.md                     # agent-first, one-command install
├── SKILL.md                      # agent protocol (Claude Code skill frontmatter + body)
├── LICENSE                       # MIT
├── .claude-plugin/
│   ├── plugin.json               # Claude Code plugin manifest
│   └── marketplace.json          # makes the repo itself a 1-plugin marketplace
├── skills/
│   └── zoon/
│       └── SKILL.md              # identical to root SKILL.md (Claude plugin layout convention)
├── docs/
│   └── human.md                  # optional human-oriented feature overview
└── .github/
    └── workflows/
        └── validate.yml          # CI: frontmatter lint, markdown lint
```

### `SKILL.md` content

Derive from the existing `docs/zoon-agent.skill.md` in the parent project (already battle-tested as the `/skill` endpoint). Prepend Claude Code skill frontmatter:

```yaml
---
name: zoon
description: Collaborate in a Zoon markdown doc via HTTP. Use when a user shares a zoon.up.railway.app URL or asks the agent to edit a Zoon document — the skill tells the agent how to read state, propose edits as comments, and apply them after human approval.
---
```

Body: identical to the `/skill` endpoint output (connect → propose comments → wait for thumbs-up → apply edit).

### `plugin.json`

```json
{
  "name": "zoon",
  "version": "0.1.0",
  "description": "Agent-native collaborative editing skill for Zoon documents.",
  "author": "stephenfan",
  "license": "MIT",
  "repository": "https://github.com/stephenfan/zoon-skill"
}
```

### `marketplace.json`

Single-entry marketplace pointing at this repo so `/plugin marketplace add stephenfan/zoon-skill` works:

```json
{
  "name": "zoon-skill",
  "plugins": [
    {
      "name": "zoon",
      "source": ".",
      "description": "Zoon collaborative editing skill"
    }
  ]
}
```

### Agent-first README

Skeleton (final copy written during implementation):

```markdown
# zoon-skill

Drop-in skill: any agent can collaborate in a Zoon doc via plain HTTP. No SDK, no browser automation.

## For your agent (one command)

**Claude Code:**
```
/plugin marketplace add stephenfan/zoon-skill
/plugin install zoon@zoon-skill
```

**Codex / any HTTP-capable agent:**
Share either URL with your agent and tell it to follow the instructions. The live endpoint is preferred because it always matches the deployed service:
```
https://zoon.up.railway.app/skill
```
Offline / pinned copy (synced from the endpoint):
```
https://raw.githubusercontent.com/stephenfan/zoon-skill/main/SKILL.md
```

## What the agent will do

1. Read the Zoon doc URL you share.
2. Propose edits as comments.
3. Wait for your thumbs-up.
4. Apply the edit.

## Human-oriented overview

See `docs/human.md`.
```

No feature lists, screenshots, or project history at the top — every byte serves the install path. Human-readable context lives in `docs/human.md` for anyone who scrolls.

### Sync between `/skill` endpoint and repo

To keep the skill content in one place:

- Primary source of truth: `docs/zoon-agent.skill.md` in the parent Zoon repo (what `/skill` serves).
- The `zoon-skill` repo's `SKILL.md` is regenerated from it.
- Add a GitHub Action in the parent repo: when `docs/zoon-agent.skill.md` changes on `main`, open a PR in `zoon-skill` that updates `SKILL.md` + `skills/zoon/SKILL.md` (prepended with the Claude Code frontmatter block).

This keeps the protocol drift-free without manual work.

### Verification plan

1. `git clone` the new repo into a fresh Claude Code environment.
2. `/plugin marketplace add` the local path; `/plugin install zoon@zoon-skill`.
3. In a fresh Claude Code session, reference a zoon.up.railway.app doc URL — confirm the Skill tool surfaces the `zoon` skill.
4. For Codex/generic path: feed an agent only the raw `SKILL.md` URL and a Zoon doc URL; confirm it can go through the comment-propose-approve-apply loop against the live service.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Replacing logo asset filenames breaks existing og:image URLs already indexed by social media caches | Add a 301 redirect from `/assets/proof-logo.svg` → `/assets/zoon-logo.svg` in `server/public-entry-routes.ts` for a transition period. |
| Dropping the ADR erases architectural context for maintainers | Keep the neutral rewrite in place; decisions stay documented, lineage doesn't. |
| `grep proof` in `src/ui/*` flags false positives for internal identifiers that happen to live in user-visible files | Do targeted line-by-line review per UI file; only touch string literals rendered to the DOM. |
| `zoon-skill` repo's SKILL.md drifts from `/skill` endpoint | Automated sync via GitHub Action (see above). |
| Colleague's Claude Code / Codex can't actually install the plugin as described | Validate install flow end-to-end on a fresh environment before announcing the repo. |

---

## Out of scope (explicitly deferred)

- Renaming `proof-share.db` → `zoon.db` (requires DB migration).
- Renaming internal packages (`packages/proof-*`).
- Self-hosted deployment guide for the skill (skill depends on `zoon.up.railway.app`; self-hosting is a Task-3 later).
- Skill market registration on third-party marketplaces (clawhub, etc.) — the GitHub repo is enough for the colleague use-case stated.

---

## Acceptance criteria

1. Browsing the live Zoon app and all committed docs reveals no Proof references.
2. A colleague receives only the URL `https://github.com/stephenfan/zoon-skill` and can install + use the skill in Claude Code with no further instructions from the user.
3. The parent repo still builds and all existing tests pass (no internal identifiers were touched).
