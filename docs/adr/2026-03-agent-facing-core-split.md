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
