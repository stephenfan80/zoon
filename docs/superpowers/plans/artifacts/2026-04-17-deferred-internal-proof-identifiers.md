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
