// Phase B of the ZOON_AGENT_CONTRACT collapse plan: before we delete the
// fan-out aliases, we need data on who's still calling them.
//
// This middleware fires on every request hitting an agent route. When the
// request targets one of the routes flagged as "Not in the contract" in
// docs/ZOON_AGENT_CONTRACT.md, it:
//
//   1. Attaches RFC 8594-flavored deprecation headers to the response so
//      agents can see they're on a deprecated path (without breaking them):
//        Deprecation: true
//        Link: </api/agent/:slug/ops>; rel="successor-version"
//        X-Zoon-Successor-Op: <opType>      (when successor is /ops)
//
//   2. Emits a single structured log line [deprecated-route] per request
//      with enough context to tell internal-frontend vs external-agent
//      traffic apart (user-agent, origin, presence of X-Agent-Id header).
//      NO token values, no request body — just routing + identity hints.
//
// After 2-4 weeks of logs we should know:
//   - Which routes are actually still hit in prod
//   - Whether the remaining callers are zoon's own frontend or external
//     agents that didn't read the new contract yet
// That's the go/no-go signal for Phase C (deleting the routes).
//
// Explicitly NOT deprecated: /:slug/quarantine, /:slug/repair,
// /:slug/clone-from-canonical. Those are owner-only admin endpoints, not
// fan-out aliases for /ops — they have no successor on the public contract.

import type { NextFunction, Request, Response } from 'express';

export type DeprecatedRouteSuccessor = {
  /**
   * Human-readable path of the successor route, with `:slug` as a literal
   * placeholder. Used both in the Link header and the structured log.
   */
  successorPath: string;
  /**
   * If the successor is `/ops`, the `op` type the caller should send.
   * Used to populate the `X-Zoon-Successor-Op` hint header so auto-
   * migrating agents can fill in the replacement payload without parsing
   * a markdown doc.
   */
  opType?: string;
};

/**
 * Source of truth for "these paths are deprecated fan-out aliases."
 *
 * Keys are the path SUFFIX the request lands on inside the agent router
 * (agent-routes.ts mounts paths relative to `/api/agent`, so `req.path`
 * inside this middleware looks like `/<slug>/marks/comment`).
 *
 * Each suffix here MUST correspond to a row in docs/ZOON_AGENT_CONTRACT.md
 * "Not in the contract" table — the regression test locks that alignment.
 */
export const DEPRECATED_FAN_OUT_ROUTES: Record<string, DeprecatedRouteSuccessor> = {
  'marks/comment': { successorPath: '/api/agent/:slug/ops', opType: 'comment.add' },
  'marks/reply': { successorPath: '/api/agent/:slug/ops', opType: 'comment.reply' },
  'marks/resolve': { successorPath: '/api/agent/:slug/ops', opType: 'comment.resolve' },
  'marks/unresolve': { successorPath: '/api/agent/:slug/ops', opType: 'comment.unresolve' },
  'marks/suggest-replace': { successorPath: '/api/agent/:slug/ops', opType: 'suggestion.add' },
  'marks/suggest-insert': { successorPath: '/api/agent/:slug/ops', opType: 'suggestion.add' },
  'marks/suggest-delete': { successorPath: '/api/agent/:slug/ops', opType: 'suggestion.add' },
  'marks/accept': { successorPath: '/api/agent/:slug/ops', opType: 'suggestion.accept' },
  'marks/reject': { successorPath: '/api/agent/:slug/ops', opType: 'suggestion.reject' },
  rewrite: { successorPath: '/api/agent/:slug/ops', opType: 'rewrite.apply' },
  edit: { successorPath: '/api/agent/:slug/edit/v2' },
  snapshot: { successorPath: '/api/agent/:slug/state' },
};

/**
 * Match `req.path` (shape: `/<slug>/<rest...>`) against the deprecation map
 * and return the matching key + successor, or null.
 *
 * Exported so the regression test can reach in without spinning up Express.
 */
export function matchDeprecatedRoute(reqPath: string): {
  key: string;
  successor: DeprecatedRouteSuccessor;
} | null {
  // req.path inside agentRoutes looks like "/h0j9vpdf/marks/comment".
  // Strip leading slash + the slug segment to get "marks/comment".
  const trimmed = reqPath.replace(/^\/+/, '');
  const firstSlash = trimmed.indexOf('/');
  if (firstSlash === -1) return null;
  const rest = trimmed.slice(firstSlash + 1);
  const direct = DEPRECATED_FAN_OUT_ROUTES[rest];
  if (direct) return { key: rest, successor: direct };
  return null;
}

function truncate(value: string | undefined | null, max = 160): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildSuccessorUrl(slug: string, successorPath: string): string {
  return successorPath.replace(':slug', slug);
}

/**
 * Express middleware: tag deprecated fan-out routes with RFC 8594 headers
 * and emit a single [deprecated-route] log line per hit.
 *
 * Safe for non-deprecated routes: early returns with `next()` and touches
 * nothing.
 */
export function attachDeprecationHints(req: Request, res: Response, next: NextFunction): void {
  const match = matchDeprecatedRoute(req.path);
  if (!match) {
    next();
    return;
  }

  const slug = (req.params?.slug as string | undefined)
    ?? (req.path.split('/').filter(Boolean)[0] ?? 'unknown');
  const successorUrl = buildSuccessorUrl(slug, match.successor.successorPath);

  // --- Response headers ---
  // RFC 8594 `Deprecation` — boolean-true form (value `true` means "deprecated now"
  // without committing to a sunset date; Phase C will add Sunset once we have data).
  res.setHeader('Deprecation', 'true');
  res.setHeader('Link', `<${successorUrl}>; rel="successor-version"`);
  if (match.successor.opType) {
    res.setHeader('X-Zoon-Successor-Op', match.successor.opType);
  }

  // --- Structured log ---
  // Railway aggregates stdout; grepping `[deprecated-route]` gives the hit rate.
  const agentIdHeader = req.header('x-agent-id');
  const shareTokenHeader = req.header('x-share-token');
  const bridgeTokenHeader = req.header('x-bridge-token');
  console.log('[deprecated-route]', JSON.stringify({
    ts: new Date().toISOString(),
    method: req.method,
    route: `${req.method} /:slug/${match.key}`,
    slug,
    agentId: truncate(typeof agentIdHeader === 'string' ? agentIdHeader : null),
    userAgent: truncate(req.header('user-agent')),
    origin: truncate(req.header('origin')),
    referer: truncate(req.header('referer')),
    hasShareToken: Boolean(shareTokenHeader) || Boolean(bridgeTokenHeader)
      || typeof req.query?.token === 'string',
    successor: {
      path: match.successor.successorPath,
      op: match.successor.opType ?? null,
    },
  }));

  next();
}
