# Proof Removal + Zoon Skill Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Remove every user-visible trace that Zoon was derived from the Proof open-source project. (2) Publish a standalone `zoon-skill` GitHub repo so colleagues can install Zoon as an agent-usable skill in Claude Code or Codex from a single URL.

**Architecture:** Task 1 is a targeted scrub — text/asset edits in user-visible surfaces only; internal code identifiers (`proof-marks`, `proof-*.ts`, CSS classes, data attributes, cookies, HTTP headers, env var names) stay so nothing breaks. Task 2 creates a fresh public repo that wraps the already-agent-ready `/skill` endpoint content with a Claude Code plugin manifest and an agent-first README.

**Tech Stack:** Markdown, plain SVG (wordmark logo), Claude Code plugin format (`plugin.json` + `marketplace.json` + Skill frontmatter), GitHub Actions (for cross-repo sync).

**Spec reference:** `docs/superpowers/specs/2026-04-17-proof-removal-and-skill-package-design.md`

---

## Audit findings that changed the spec (read first)

During plan writing I audited each file. A few things to know before starting:

- **`src/index.html` has 0 real user-visible Proof strings** — all 23 grep matches are CSS class names (`proof-task-item`, `proof-mermaid-*`), `data-proof` attributes, or `window.__PROOF_CONFIG__`. These are invisible in normal use and cross-referenced by TS code; renaming them is scope B (not requested). Plan touches `src/index.html` only to update asset paths referring to `/assets/proof-logo*`.
- **UI files (`src/ui/*.ts`) are mostly already clean for visible text.** "Proof" survives in CSS variables (`--proof-bg`), CSS classes (`proof-context-menu`), CustomEvent names (`proof:invoke-agent`), JSDoc comments, and localStorage keys (`proof-share-viewer-name`). Only one actual visible string was found: `src/ui/context-menu.ts:297` injects the literal `'[For @proof to review]'` as comment body text.
- **Env vars** (`PROOF_SHARE_MARKDOWN_AUTH_MODE`, `PROOF_LEGACY_CREATE_MODE`) appear in `AGENT_CONTRACT.md`. They're admin-configured and not normally user-visible, but the doc shows them. Plan: keep the env var names in code (renaming would require coordinated deployment config changes), but rewrite the doc prose so it doesn't prominently feature `PROOF_*` branding — describe the vars as "share markdown auth mode" etc. and put the literal names in a small "configuration reference" block.
- **Devtools-level leakage** (cookie `proof_session`, localStorage `proof-home-auth-refresh-at`, HTTP header `x-proof-*`) is **out of scope** for this plan — scope A says user-visible-in-normal-use. A one-paragraph note will be added to the final commit message so future-you knows these remain.

The spec is still accurate at the design level; the plan narrows the exact files to match reality.

---

## Task 1A: Baseline snapshot and audit command

**Files:**
- Create: `docs/superpowers/plans/artifacts/2026-04-17-proof-audit-before.txt` (baseline grep output — not committed, but generated for the session)

- [ ] **Step 1: Capture baseline grep of all user-visible Proof mentions**

Run:
```bash
mkdir -p docs/superpowers/plans/artifacts
grep -rniE "proof" \
  README.md \
  AGENT_CONTRACT.md \
  docs/welcome-zh.md \
  docs/agent-docs.md \
  docs/adr/ \
  docs/conversation-zoon-analysis-2026-04-02.md \
  src/index.html \
  src/ui/ \
  server/homepage-script.ts \
  server/share-web-routes.ts \
  server/public-entry-routes.ts \
  public/assets/ \
  > docs/superpowers/plans/artifacts/2026-04-17-proof-audit-before.txt 2>&1 || true
wc -l docs/superpowers/plans/artifacts/2026-04-17-proof-audit-before.txt
```
Expected: a file with roughly 200-250 lines. We'll diff this against a post-change audit at Task 1J.

- [ ] **Step 2: Verify baseline build passes**

Run:
```bash
npm run build
```
Expected: build succeeds with no errors. (If this already fails, stop and fix before proceeding — otherwise you can't tell if your changes broke anything.)

- [ ] **Step 3: Commit nothing yet — baseline is session-local.**

The audit artifact file is in `.gitignore`-worthy territory but we're fine leaving it uncommitted. No commit this step.

---

## Task 1B: Generate the Zoon wordmark logo

**Files:**
- Create: `public/assets/zoon-logo.svg`
- Create: `public/assets/og-share/zoon-logo-outlined.svg`

- [ ] **Step 1: Write the full wordmark SVG**

Create `public/assets/zoon-logo.svg` with this content:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 72" width="240" height="72" role="img" aria-label="zoon">
  <style>
    .zoon-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-weight: 700; font-size: 56px; letter-spacing: -0.02em; }
  </style>
  <text x="8" y="54" class="zoon-text" fill="#111">z</text>
  <text x="44" y="54" class="zoon-text" fill="#16A34A">o</text>
  <text x="92" y="54" class="zoon-text" fill="#8B5CF6">o</text>
  <text x="140" y="54" class="zoon-text" fill="#111">n</text>
</svg>
```

- [ ] **Step 2: Write the outlined variant for og:share**

Create `public/assets/og-share/zoon-logo-outlined.svg` with this content:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="Zoon">
  <rect width="1200" height="630" fill="#ffffff"/>
  <style>
    .zoon-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-weight: 800; font-size: 220px; letter-spacing: -0.02em; }
    .zoon-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 500; font-size: 36px; fill: #6b7280; letter-spacing: 0.01em; }
  </style>
  <text x="180" y="340" class="zoon-text" fill="#111">z</text>
  <text x="310" y="340" class="zoon-text" fill="#16A34A">o</text>
  <text x="478" y="340" class="zoon-text" fill="#8B5CF6">o</text>
  <text x="646" y="340" class="zoon-text" fill="#111">n</text>
  <text x="180" y="430" class="zoon-sub">agent-native collaborative markdown</text>
</svg>
```

- [ ] **Step 3: Eyeball the two SVGs in a browser**

Run:
```bash
open public/assets/zoon-logo.svg public/assets/og-share/zoon-logo-outlined.svg
```
Expected: both render cleanly — `z` + black + `o` green + `o` purple + `n` black wordmark. The og variant is 1200x630 with a tagline.

- [ ] **Step 4: Commit**

```bash
git add public/assets/zoon-logo.svg public/assets/og-share/zoon-logo-outlined.svg
git commit -m "feat(brand): add Zoon wordmark logo + og:share variant"
```

---

## Task 1C: Delete legacy Proof logo assets and update references

**Files:**
- Delete: `public/assets/proof-logo.svg`
- Delete: `public/assets/proof-logo-animation-v2.lottie`
- Delete: `public/assets/og-share/proof-logo-outlined.svg`
- Modify: any file referencing those paths (to be discovered via grep)

- [ ] **Step 1: Find every reference to the old asset paths**

Run:
```bash
grep -rnE "(proof-logo\.svg|proof-logo-outlined\.svg|proof-logo-animation-v2\.lottie|proof-logo-animation|lottie\.min\.js)" \
  src/ server/ docs/ public/ README.md AGENT_CONTRACT.md 2>&1 | tee /tmp/proof-logo-refs.txt
```
Expected: a list of every file that references the soon-to-be-deleted assets. Typically: `src/index.html`, `server/homepage-script.ts`, maybe `server/share-web-routes.ts` or share-preview.

- [ ] **Step 2: Update each reference**

For each line in `/tmp/proof-logo-refs.txt`:
- If it references `proof-logo.svg` → replace with `zoon-logo.svg`
- If it references `proof-logo-outlined.svg` → replace with `zoon-logo-outlined.svg`
- If it references `proof-logo-animation-v2.lottie` → delete the referencing line (animation is removed; falls back to static SVG). If removing the line leaves an empty block or dangling call, remove that too.
- If it references `lottie.min.js` and no other consumer exists → remove that script include.

Use the Edit tool per file. After each file edit, re-read to confirm.

- [ ] **Step 3: Delete the old asset files**

Run:
```bash
rm public/assets/proof-logo.svg
rm public/assets/proof-logo-animation-v2.lottie
rm public/assets/og-share/proof-logo-outlined.svg
```

- [ ] **Step 4: Check if `lottie.min.js` is now unreferenced**

Run:
```bash
grep -rn "lottie" src/ server/ public/ 2>&1 | head
```
If zero hits: `rm public/assets/lottie.min.js`. If any hits remain, leave it (some other consumer).

- [ ] **Step 5: Build to catch broken references**

Run:
```bash
npm run build
```
Expected: build succeeds. If it fails with missing asset or module errors, fix the reference you missed in Step 2.

- [ ] **Step 6: Commit**

```bash
git add -A public/assets/ src/ server/
git commit -m "chore(assets): replace legacy logo assets with Zoon wordmark"
```

---

## Task 1D: Scrub README.md

**Files:**
- Modify: `README.md:93-95` (delete Credits section)

- [ ] **Step 1: Read current Credits section**

Confirm lines 89-95:
```
## License

MIT — see `LICENSE`.

## Credits

Built on top of the open-source [Proof SDK](https://github.com/EveryInc/proof-sdk).
```

- [ ] **Step 2: Delete the Credits section**

Use Edit to remove the `## Credits` heading and the single content line under it, leaving the License section as the last section of the file. The end of README.md after the edit should be:
```
## License

MIT — see `LICENSE`.
```
(No trailing `## Credits` block.)

- [ ] **Step 3: Verify no Proof leftovers in README**

Run:
```bash
grep -ni "proof" README.md
```
Expected: zero hits.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): drop Credits section"
```

---

## Task 1E: Scrub `docs/welcome-zh.md`

**Files:**
- Modify: `docs/welcome-zh.md:64`

- [ ] **Step 1: Read line 64 and surrounding context**

Run:
```bash
sed -n '60,70p' docs/welcome-zh.md
```
Expected: line 64 reads `*Zoon 是 [Proof](https://proofeditor.ai) 的本地 fork，MIT 开源。*`

- [ ] **Step 2: Replace with MIT-only attribution**

Use Edit:
- old_string: `*Zoon 是 [Proof](https://proofeditor.ai) 的本地 fork，MIT 开源。*`
- new_string: `*Zoon 基于 MIT 协议开源。*`

- [ ] **Step 3: Verify clean**

Run:
```bash
grep -ni "proof" docs/welcome-zh.md
```
Expected: zero hits.

- [ ] **Step 4: Commit**

```bash
git add docs/welcome-zh.md
git commit -m "docs(welcome): drop fork attribution line"
```

---

## Task 1F: Scrub `docs/agent-docs.md`

**Files:**
- Modify: `docs/agent-docs.md` (11 occurrences across title, headers, body, example URLs)

- [ ] **Step 1: Enumerate every Proof occurrence**

Run:
```bash
grep -niE "proof" docs/agent-docs.md
```
Expected: lines 1, 3, 5, 7, 25, 40, 348, 359, 403, 408, 418 (the list captured during audit).

- [ ] **Step 2: Apply substitutions**

Use Edit (not replace_all — context-dependent):

1. Line 1: `# Proof Agent Docs` → `# Zoon Agent Docs`
2. Line 3: `## Proof SDK Route Alias` → `## Agent Route Alias`
3. Line 5: `Hosted Proof keeps the `/api/agent/*` and `/share/markdown` compatibility routes.` → `Zoon keeps the `/api/agent/*` and `/share/markdown` compatibility routes.`
4. Line 7: `The reusable `Proof SDK` surface is mounted in parallel at:` → `The reusable agent-facing surface is mounted in parallel at:`
5. Line 25: `Proof has three editing approaches. **Pick one — don't mix them.**` → `Zoon has three editing approaches. **Pick one — don't mix them.**`
6. Line 40: `## I Just Received A Proof Link` → `## I Just Received A Zoon Link`
7. Line 348: the example URL `https://proof-web-staging.up.railway.app` → `https://zoon-staging.up.railway.app`
8. Line 359: `Hosted Proof still accepts `POST /share/markdown` as a compatibility alias.` → `Zoon still accepts `POST /share/markdown` as a compatibility alias.`
9. Lines 403, 408, 418: `<span data-proof="authored">` — these are referencing a **real internal HTML annotation that agents will actually encounter in responses**. Do NOT change the `data-proof` attribute name in the doc (that would lie — the actual bytes say `data-proof`). Instead, replace the surrounding prose to avoid the "Proof" branding:
   - Line 403: `Previously-authored text may contain `<span data-proof="authored">` tags internally.` → `Previously-authored text may contain internal `<span data-proof="authored">` provenance tags.` (keep the attribute name literal — it's a real payload)
   - Line 408: `HTML tags. The search now automatically falls back` → keep same (no "Proof" branding in this sentence beyond the literal attribute)
   - Line 418: keep same

   The `data-proof` attribute is internal-mechanism leak (scope B) — flag in final commit but don't change here.

- [ ] **Step 3: Re-audit**

Run:
```bash
grep -ni "proof" docs/agent-docs.md
```
Expected: only `data-proof="authored"` literals (3 occurrences — documenting real HTML payload). Everything else should be gone.

- [ ] **Step 4: Commit**

```bash
git add docs/agent-docs.md
git commit -m "docs(agent-docs): rewrite prose to Zoon; keep data-proof as literal payload reference"
```

---

## Task 1G: Scrub `AGENT_CONTRACT.md`

**Files:**
- Modify: `AGENT_CONTRACT.md` (6 occurrences: 5 example URLs + 3 env var names)

- [ ] **Step 1: Enumerate**

Run:
```bash
grep -niE "proof" AGENT_CONTRACT.md
```
Expected: lines 60, 62, 68, 93, 96, 99.

- [ ] **Step 2: Replace example URLs**

Use Edit for each:
- `"shareUrl": "https://your-proof.example/d/abc123xy"` → `"shareUrl": "https://your-zoon.example/d/abc123xy"`
- `"tokenUrl": "https://your-proof.example/d/abc123xy?token=..."` → `"tokenUrl": "https://your-zoon.example/d/abc123xy?token=..."`
- `"snapshotUrl": "https://your-proof.example/snapshots/abc123xy.html"` → `"snapshotUrl": "https://your-zoon.example/snapshots/abc123xy.html"`

- [ ] **Step 3: Rewrite env var prose**

The env vars `PROOF_SHARE_MARKDOWN_AUTH_MODE`, `PROOF_SHARE_MARKDOWN_API_KEY`, `PROOF_LEGACY_CREATE_MODE` are **real names the code reads** from `process.env.*`. Don't rename them in the code (out of scope). Instead, rewrite the prose that introduces them so the Zoon reader doesn't see "Proof" branding as the heading/description, but the literal var name stays as a code reference.

For the block around line 93:
- Old: `` `PROOF_SHARE_MARKDOWN_AUTH_MODE` controls direct-share auth: `` →
- New: `` Direct-share auth mode is controlled by `PROOF_SHARE_MARKDOWN_AUTH_MODE` (legacy name; not renamed to preserve deployed configuration). It supports: ``

For the line with `api_key: require PROOF_SHARE_MARKDOWN_API_KEY` — keep as-is; it's a literal code identifier.

For the block around line 99:
- Old: `` `/api/documents` is governed separately by `PROOF_LEGACY_CREATE_MODE`: `` →
- New: `` `/api/documents` is governed separately by the legacy-named env var `PROOF_LEGACY_CREATE_MODE`: ``

- [ ] **Step 4: Re-audit**

Run:
```bash
grep -ni "proof" AGENT_CONTRACT.md
```
Expected: only the 3 literal env var references (`PROOF_SHARE_MARKDOWN_AUTH_MODE`, `PROOF_SHARE_MARKDOWN_API_KEY`, `PROOF_LEGACY_CREATE_MODE`). Prose is clean.

- [ ] **Step 5: Commit**

```bash
git add AGENT_CONTRACT.md
git commit -m "docs(agent-contract): neutralize example URLs; keep env var names as literals with note"
```

---

## Task 1H: Rewrite the ADR as a neutral decision record

**Files:**
- Modify: `docs/adr/2026-03-proof-sdk-public-core.md` (full rewrite)
- Rename: `docs/adr/2026-03-proof-sdk-public-core.md` → `docs/adr/2026-03-agent-facing-core-split.md`

- [ ] **Step 1: Rename the file**

Run:
```bash
git mv docs/adr/2026-03-proof-sdk-public-core.md docs/adr/2026-03-agent-facing-core-split.md
```

- [ ] **Step 2: Rewrite the body**

Use Write to replace the file contents with:
```markdown
# ADR: Agent-facing Core Split

**Date:** 2026-03
**Status:** Accepted

## Context

Zoon exposes two distinct surfaces that share most of the implementation but have different compatibility guarantees:

- The hosted product at `zoon.up.railway.app` — user-facing editor and public routes.
- A reusable agent-facing core — a well-defined set of HTTP contracts (`/documents/:slug/state`, `/documents/:slug/ops`, `/api/agent/:slug/edit/v2`) that any third-party agent can call.

Bundling them together has two costs: (1) agent-surface changes risk breaking the hosted product's implicit assumptions, and (2) the agent surface is hard to test and document in isolation.

## Decision

Maintain a layered architecture where the agent-facing surface is mounted as an independent set of modules:

- `packages/doc-core` — document model, provenance marks, block schema.
- `packages/doc-editor` — ProseMirror/Milkdown editor wiring.
- `packages/doc-server` — HTTP route handlers for agent-facing endpoints.
- `packages/doc-store-sqlite` — persistence backend.
- `packages/agent-bridge` — transport and orchestration for agent clients.

Hosted Zoon composes these packages; the agent surface exposes documented HTTP contracts that external agents can consume directly via `/skill`.

## Consequences

- **Positive:** Agent-surface contracts become first-class — versioned routes, clear failure modes, documented in `docs/agent-docs.md`.
- **Positive:** The hosted product can evolve its UI and UX without breaking any agent integration built against the documented contracts.
- **Negative:** Shared-module boundary discipline is required — any change that touches `packages/*` needs to consider both the hosted product and any out-of-tree agent consumers.

## Alternatives considered

- **Keep everything in `server/`:** simpler today, but couples agent contracts to the hosted product's release cycle. Rejected.
- **Extract the agent core into a separate repository:** clean boundary, but creates cross-repo versioning overhead for a single maintainer. Deferred — revisit when there's more than one consumer.
```

- [ ] **Step 3: Re-audit**

Run:
```bash
grep -ni "proof" docs/adr/2026-03-agent-facing-core-split.md
```
Expected: zero hits.

- [ ] **Step 4: Commit**

```bash
git add docs/adr/
git commit -m "docs(adr): rewrite core-split ADR as neutral architecture record"
```

---

## Task 1I: Delete the conversation-analysis doc

**Files:**
- Delete: `docs/conversation-zoon-analysis-2026-04-02.md`

Rationale: the file is a 290-line deep analysis of "Proof — the open-source AI-native collaborative document editor," with the source repo URL and architecture diagrams all labeled Proof. Rewriting it is a lot of work for a historical conversation log that's not serving an ongoing documentation purpose. Delete.

- [ ] **Step 1: Delete**

Run:
```bash
git rm docs/conversation-zoon-analysis-2026-04-02.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "docs: drop conversation-analysis log (historical, Proof-branded)"
```

---

## Task 1J: Scrub the one visible UI string literal

**Files:**
- Modify: `src/ui/context-menu.ts:297`

- [ ] **Step 1: Read the target line**

Run:
```bash
sed -n '290,300p' src/ui/context-menu.ts
```
Expected: line 297 calls `addComment(view, text, actor, '[For @proof to review]', { from, to });`.

- [ ] **Step 2: Replace the literal**

Use Edit:
- old_string: `addComment(view, text, actor, '[For @proof to review]', { from, to });`
- new_string: `addComment(view, text, actor, '[For @zoon to review]', { from, to });`

- [ ] **Step 3: Commit**

```bash
git add src/ui/context-menu.ts
git commit -m "fix(ui): replace '[For @proof to review]' with @zoon in comment template"
```

---

## Task 1K: Final audit + smoke test

**Files:**
- Reference only

- [ ] **Step 1: Post-change grep for user-visible Proof references**

Run:
```bash
grep -rnE "[Pp]roof" \
  README.md \
  AGENT_CONTRACT.md \
  docs/welcome-zh.md \
  docs/agent-docs.md \
  docs/adr/ \
  src/index.html \
  src/ui/ \
  public/assets/ \
  2>&1 | \
grep -viE "(--proof-|\\.proof-|proof-context|proof-menu|proof-submenu|proof-keybind|proof-review|proof-share|proof-theme|proof-task|proof-code|proof-mermaid|proof-name-prompt|proofNamePrompt|proof:invoke|proof-agent'|'proof-agent|data-proof|className|class=|ask-proof|proofAuthored|__PROOF_|window\\.proof|proofReview|PROOF_SHARE_MARKDOWN|PROOF_LEGACY_CREATE|window\\.__proof|import.*proof|from .*proof)"
```
Expected: zero uncovered hits. Any surprise hit here means we missed a user-visible string — fix it and re-run.

- [ ] **Step 2: Run the test suite**

Run:
```bash
npm run build
```
Expected: passes. If tests exist for string-rendered content that happen to assert on old Proof strings, fix the test.

- [ ] **Step 3: Start dev server + manual smoke**

Run:
```bash
npm run serve
```
(in background, or user-triggered)

Then manually verify:
1. Open `http://localhost:4000/` — page title reads Zoon; no Proof anywhere in visible text.
2. View page source — `<meta og:image>` references `/assets/og-share/zoon-logo-outlined.svg` (or whatever is current); `<link rel="icon">` does NOT reference `proof-logo`.
3. Create a document; right-click a word; add a comment — the auto-injected `[For @zoon to review]` text should appear (not `@proof`).
4. Visit `http://localhost:4000/agent-docs` — document title "Zoon Agent Docs"; scroll through, no "Proof" in prose.

If any check fails, go back to the relevant Task (1D-1J) and fix.

- [ ] **Step 4: Final commit — add note about deferred internal identifiers**

If Step 1-3 pass, no further code changes. But create a tracking note for the out-of-scope internal identifiers so future-you knows what's still leaky at devtools level:

Use Write to create `docs/superpowers/plans/artifacts/2026-04-17-deferred-internal-proof-identifiers.md` with:
```markdown
# Deferred: internal Proof identifiers still present (scope B)

The 2026-04-17 Proof-removal pass intentionally left these internal identifiers in place. They're not visible in normal app use but appear to anyone inspecting devtools, environment config, or source code.

## Devtools-visible
- Cookie: `proof_session` (server/hosted-auth.ts, server/cookies.ts)
- localStorage: `proof-share-viewer-name`, `proof-home-auth-refresh-at`
- HTTP headers: `x-proof-live-viewer`, `x-proof-fallback`
- Window globals: `window.__PROOF_CONFIG__`, `window.proof`, `window.__proofReviewProgress`
- Custom events: `proof:invoke-agent`, `proof:stopped-all-reviews`
- HTML data attributes: `data-proof="authored"`, `data-proof="suggestion"`
- CSS classes and CSS variables: `proof-task-item`, `proof-mermaid-*`, `--proof-bg`, etc.

## Code-only (invisible to end users)
- Package names: `packages/proof-*`
- Filenames: `server/proof-*.ts`, `src/editor/schema/proof-marks.ts`, `src/agent/tools/proof-tools.ts`
- SQL tables / columns that use `proof_*` prefixes
- Database file: `proof-share.db`
- Env vars: `PROOF_SHARE_MARKDOWN_AUTH_MODE`, `PROOF_SHARE_MARKDOWN_API_KEY`, `PROOF_LEGACY_CREATE_MODE`
- `apps/proof-example/`

## Why deferred
Renaming any of these requires coordinated code + config + data migration (DB rename, cookie-compat layer for existing sessions, env var swap in Railway). That's a scope-B project, not a user-visible cleanup.

## When to revisit
If the project goes fully public or an observer reports the leak, kick off a scope-B rename pass with migration plan.
```

Then:
```bash
git add docs/superpowers/plans/artifacts/2026-04-17-deferred-internal-proof-identifiers.md
git commit -m "docs: note deferred internal Proof identifiers for future scope-B cleanup"
```

**End of Task 1.**

---

## Task 2A: Create the `zoon-skill` working directory

**Files:**
- Create: `/tmp/zoon-skill/` (staging) or a sibling directory `../zoon-skill/` (decide per executor preference)

Rationale: the new repo lives outside the current Zoon project. We stage it in a sibling directory so it's not accidentally committed into Zoon.

- [ ] **Step 1: Create the sibling directory**

Run:
```bash
mkdir -p /Users/stephenfan/个人项目/zoon-skill
cd /Users/stephenfan/个人项目/zoon-skill
git init
git branch -M main
```

- [ ] **Step 2: Confirm it's empty**

Run:
```bash
ls -la /Users/stephenfan/个人项目/zoon-skill
```
Expected: only `.git/`.

---

## Task 2B: Write `SKILL.md` (copy + frontmatter-adjust from the live source)

**Files:**
- Create: `/Users/stephenfan/个人项目/zoon-skill/SKILL.md`

- [ ] **Step 1: Copy the current `/skill` source of truth**

Run:
```bash
cp /Users/stephenfan/个人项目/zoon/docs/zoon-agent.skill.md /Users/stephenfan/个人项目/zoon-skill/SKILL.md
```

- [ ] **Step 2: Audit frontmatter**

Read `/Users/stephenfan/个人项目/zoon-skill/SKILL.md` lines 1-5. The frontmatter should already be:
```yaml
---
name: zoon
description: Collaborate inside a Zoon document. Read the doc first, leave 👍-gated comment suggestions, and only apply edits after the human replies 👍. Use plain HTTP — no browser automation needed.
---
```
If it's different, normalize to the above (this is the canonical skill frontmatter that Claude Code reads).

- [ ] **Step 3: Verify no Proof mentions**

Run:
```bash
grep -ni "proof" /Users/stephenfan/个人项目/zoon-skill/SKILL.md
```
Expected: zero. (The source file was already clean.)

---

## Task 2C: Write the Claude Code plugin manifest

**Files:**
- Create: `/Users/stephenfan/个人项目/zoon-skill/.claude-plugin/plugin.json`
- Create: `/Users/stephenfan/个人项目/zoon-skill/skills/zoon/SKILL.md` (duplicate of root, per Claude Code plugin layout convention)

- [ ] **Step 1: Create `plugin.json`**

```bash
mkdir -p /Users/stephenfan/个人项目/zoon-skill/.claude-plugin
```

Write `/Users/stephenfan/个人项目/zoon-skill/.claude-plugin/plugin.json`:
```json
{
  "name": "zoon",
  "version": "0.1.0",
  "description": "Agent-native collaborative editing skill. Any HTTP-capable agent can read, comment on, and — after a human thumbs-up — edit a Zoon document.",
  "author": "stephenfan",
  "license": "MIT",
  "repository": "https://github.com/stephenfan/zoon-skill",
  "skills": ["skills/zoon/SKILL.md"]
}
```

- [ ] **Step 2: Duplicate SKILL.md into the `skills/` layout**

Run:
```bash
mkdir -p /Users/stephenfan/个人项目/zoon-skill/skills/zoon
cp /Users/stephenfan/个人项目/zoon-skill/SKILL.md /Users/stephenfan/个人项目/zoon-skill/skills/zoon/SKILL.md
```

This satisfies the Claude Code plugin directory convention while keeping a convenient root-level `SKILL.md` for HTTP-fetch-based agents (Codex, generic).

---

## Task 2D: Write the `marketplace.json`

**Files:**
- Create: `/Users/stephenfan/个人项目/zoon-skill/.claude-plugin/marketplace.json`

- [ ] **Step 1: Write the 1-plugin marketplace manifest**

Write `/Users/stephenfan/个人项目/zoon-skill/.claude-plugin/marketplace.json`:
```json
{
  "name": "zoon-skill",
  "description": "Zoon agent skill marketplace",
  "owner": {
    "name": "stephenfan"
  },
  "plugins": [
    {
      "name": "zoon",
      "source": ".",
      "description": "Agent-native collaborative editing for Zoon documents."
    }
  ]
}
```

This makes the repo itself work as a single-plugin marketplace: `/plugin marketplace add stephenfan/zoon-skill` will discover this file and offer `zoon` as an installable plugin.

---

## Task 2E: Write the agent-first README

**Files:**
- Create: `/Users/stephenfan/个人项目/zoon-skill/README.md`

- [ ] **Step 1: Write README with install-first structure**

Write `/Users/stephenfan/个人项目/zoon-skill/README.md`:
```markdown
# zoon-skill

Drop-in skill: any agent can collaborate in a Zoon doc via plain HTTP. No SDK, no browser automation, no special libraries. Just HTTP + JSON + a thumbs-up protocol.

## For your agent (one command)

**Claude Code:**
```
/plugin marketplace add stephenfan/zoon-skill
/plugin install zoon@zoon-skill
```

**Codex / any HTTP-capable agent:**

Share either URL with your agent and tell it to follow the instructions. Prefer the live endpoint — it always matches the deployed service:

- Live: `https://zoon.up.railway.app/skill`
- Pinned copy (synced from the live endpoint): `https://raw.githubusercontent.com/stephenfan/zoon-skill/main/SKILL.md`

## What the agent does

1. You share a Zoon doc URL.
2. The agent reads the doc.
3. The agent proposes edits as comments.
4. You reply with a thumbs-up.
5. The agent applies the edit.

No edit lands without your approval.

## Humans: what is Zoon?

See [`docs/human.md`](docs/human.md).

## License

MIT.
```

---

## Task 2F: Write the human-oriented overview

**Files:**
- Create: `/Users/stephenfan/个人项目/zoon-skill/docs/human.md`

- [ ] **Step 1: Write a short human-readable overview**

Write `/Users/stephenfan/个人项目/zoon-skill/docs/human.md`:
```markdown
# Zoon (for humans)

Zoon is an agent-native collaborative markdown editor. Every character knows whether a human or an agent wrote it — humans appear in green, agents in purple.

The core loop: an agent reads the doc, proposes changes as comments, the human replies with a thumbs-up, and only then does the agent apply the edit.

## Try it

1. Open https://zoon.up.railway.app/
2. Create a blank document.
3. Paste your content.
4. Share the URL with any agent.
5. Review the agent's comment suggestions; reply with a thumbs-up to apply.

## What's inside the skill

The SKILL.md file your agent installs contains the full protocol — connection, state reading, comment semantics, approval wait, edit application. It's the same content served live at `https://zoon.up.railway.app/skill`, so agents that prefer fetching over installing can do either.

## Self-host

The skill talks to `https://zoon.up.railway.app` by default. If you want to run your own Zoon instance, the server is at https://github.com/stephenfan/zoon and deployment instructions are in that repo's `DEPLOY.md`.
```

---

## Task 2G: Write the LICENSE and CI

**Files:**
- Create: `/Users/stephenfan/个人项目/zoon-skill/LICENSE`
- Create: `/Users/stephenfan/个人项目/zoon-skill/.github/workflows/validate.yml`

- [ ] **Step 1: Copy LICENSE from the parent project**

```bash
cp /Users/stephenfan/个人项目/zoon/LICENSE /Users/stephenfan/个人项目/zoon-skill/LICENSE
```

- [ ] **Step 2: Write a minimal CI**

```bash
mkdir -p /Users/stephenfan/个人项目/zoon-skill/.github/workflows
```

Write `/Users/stephenfan/个人项目/zoon-skill/.github/workflows/validate.yml`:
```yaml
name: validate
on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check SKILL.md frontmatter
        run: |
          head -1 SKILL.md | grep -q "^---$" || { echo "SKILL.md missing frontmatter"; exit 1; }
          grep -q "^name:" SKILL.md || { echo "SKILL.md missing name:"; exit 1; }
          grep -q "^description:" SKILL.md || { echo "SKILL.md missing description:"; exit 1; }
      - name: Check SKILL.md matches skills/zoon/SKILL.md
        run: |
          diff SKILL.md skills/zoon/SKILL.md
      - name: Validate plugin.json
        run: |
          python3 -c "import json; json.load(open('.claude-plugin/plugin.json'))"
      - name: Validate marketplace.json
        run: |
          python3 -c "import json; json.load(open('.claude-plugin/marketplace.json'))"
```

---

## Task 2H: First commit and GitHub push

**Files:**
- Modify: everything in `/Users/stephenfan/个人项目/zoon-skill/`

- [ ] **Step 1: Stage and commit**

```bash
cd /Users/stephenfan/个人项目/zoon-skill
git add .
git commit -m "feat: initial zoon-skill release"
```

- [ ] **Step 2: Create the GitHub repo (user action required)**

**This step requires user interaction** — GitHub repo creation is visible-to-others state. Prompt the user:

> "About to create a public GitHub repo at `https://github.com/stephenfan/zoon-skill`. OK to proceed? (If not, skip this step; you can create the repo yourself later and just push to it.)"

If approved, run:
```bash
gh repo create stephenfan/zoon-skill --public --source /Users/stephenfan/个人项目/zoon-skill --push --description "Agent-native collaborative editing skill for Zoon documents"
```

If declined, stop here and print the local repo path for the user.

- [ ] **Step 3: Verify install works end-to-end (user action)**

Ask the user:
> "Fresh Claude Code session — run `/plugin marketplace add stephenfan/zoon-skill` then `/plugin install zoon@zoon-skill` and tell me if it installs cleanly."

If install fails, inspect the error and adjust `plugin.json` / `marketplace.json` format (the exact schema evolves — consult Claude Code plugin docs if `marketplace.json` format is rejected).

---

## Task 2I: Wire up /skill ↔ zoon-skill sync

**Files:**
- Modify: `/Users/stephenfan/个人项目/zoon/docs/zoon-agent.skill.md` (just a canonical-source comment)
- Create: `/Users/stephenfan/个人项目/zoon/.github/workflows/sync-skill-repo.yml`

The parent Zoon repo should automatically propagate updates to `docs/zoon-agent.skill.md` into the `zoon-skill` repo so the two never drift.

- [ ] **Step 1: Add a canonical-source comment at top of the source file**

In `/Users/stephenfan/个人项目/zoon/docs/zoon-agent.skill.md`, above the frontmatter, add:
```markdown
<!-- canonical source: published to https://github.com/stephenfan/zoon-skill/blob/main/SKILL.md on every main-branch push -->
```

- [ ] **Step 2: Write the GitHub Action for cross-repo sync**

Write `/Users/stephenfan/个人项目/zoon/.github/workflows/sync-skill-repo.yml`:
```yaml
name: sync-skill-repo
on:
  push:
    branches: [main]
    paths: ["docs/zoon-agent.skill.md"]
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout zoon
        uses: actions/checkout@v4
      - name: Checkout zoon-skill
        uses: actions/checkout@v4
        with:
          repository: stephenfan/zoon-skill
          token: ${{ secrets.ZOON_SKILL_PAT }}
          path: zoon-skill
      - name: Copy SKILL.md
        run: |
          # Strip the canonical-source HTML comment before publishing
          sed '/canonical source:/d' docs/zoon-agent.skill.md > zoon-skill/SKILL.md
          cp zoon-skill/SKILL.md zoon-skill/skills/zoon/SKILL.md
      - name: Commit and push
        run: |
          cd zoon-skill
          git config user.name "zoon-skill-sync"
          git config user.email "zoon-skill-sync@users.noreply.github.com"
          if git diff --quiet; then
            echo "No changes"
            exit 0
          fi
          git add SKILL.md skills/zoon/SKILL.md
          git commit -m "sync: update SKILL.md from zoon@main"
          git push
```

- [ ] **Step 3: Document the required secret**

The workflow needs a `ZOON_SKILL_PAT` secret — a GitHub Personal Access Token with `contents:write` on `stephenfan/zoon-skill`. This is a **user action** — prompt:

> "The sync workflow needs a GitHub Personal Access Token with `contents:write` scope on `stephenfan/zoon-skill`. Create a fine-grained PAT, add it as a repo secret named `ZOON_SKILL_PAT` in the `stephenfan/zoon` repo settings. I can't do this for you — confirm when done so we can verify the workflow fires."

- [ ] **Step 4: Commit the workflow**

```bash
cd /Users/stephenfan/个人项目/zoon
git add docs/zoon-agent.skill.md .github/workflows/sync-skill-repo.yml
git commit -m "chore(ci): sync SKILL.md to zoon-skill repo on main-branch push"
```

- [ ] **Step 5: Trigger the workflow once manually to test**

After the user has added the PAT secret:
```bash
gh workflow run sync-skill-repo -R stephenfan/zoon
gh run watch -R stephenfan/zoon
```
Expected: workflow succeeds; `zoon-skill` repo shows an updated `SKILL.md` commit (or "No changes" if identical).

**End of Task 2.**

---

## Self-review checklist

1. **Spec coverage:**
   - ✅ Task 1 covers every user-visible Proof reference tabulated in spec Task 1 file-table (README, index.html refs via asset paths, AGENT_CONTRACT, agent-docs, welcome-zh, ADR, conversation-analysis, logo assets, UI strings, homepage-script strings).
   - ✅ Task 2 covers every artifact in spec Task 2 directory layout (SKILL.md, plugin.json, marketplace.json, README, human.md, LICENSE, CI, sync workflow).
   - Gap noted and handled: `src/index.html`'s 23 Proof matches are entirely internal (CSS classes, data attrs) — documented in "Audit findings" section and in Task 1K Step 4 note.
   - Gap noted and handled: env var names (`PROOF_*`) stay in code but prose is scrubbed (Task 1G Step 3).

2. **Placeholder scan:** No "TBD", "TODO", "implement later". Every file change shows the exact content. The only deferred items are user-interactive steps (Task 2H Step 2, 2I Step 3) where the user has to authorize GitHub repo creation / create a PAT — those are explicit asks, not placeholders.

3. **Type / name consistency:**
   - Skill name: `zoon` (in `plugin.json`, `marketplace.json`, `SKILL.md` frontmatter, install commands) — consistent.
   - Repo name: `zoon-skill` — consistent across all 2.x tasks.
   - File paths: `/Users/stephenfan/个人项目/zoon-skill/` vs `/Users/stephenfan/个人项目/zoon/` — consistent.
   - Logo assets: `zoon-logo.svg` + `zoon-logo-outlined.svg` — consistent.

4. **Scope:** Plan is focused on two clearly delineated tasks. Task 2 depends on nothing from Task 1 (they could technically run in parallel or reversed), but sequencing them 1 → 2 makes sense because Task 1 validates the Proof scrub before packaging.
