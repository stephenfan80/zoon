import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: Phase B of the contract collapse adds deprecation headers +
// [deprecated-route] logging to every fan-out alias listed as "Not in the
// contract" in docs/ZOON_AGENT_CONTRACT.md. The data from these logs is the
// gate for Phase C (actually deleting the routes), so the middleware HAS to
// fire on every one of them — missing even one would under-count external
// callers and cause us to delete too early.
//
// This test locks 5 invariants:
//
//   1. attachDeprecationHints is wired onto agentRoutes BEFORE any route
//      definition (otherwise handlers can short-circuit the response before
//      headers attach, and some hits go unlogged).
//
//   2. Every row in docs/ZOON_AGENT_CONTRACT.md's "Not in the contract"
//      fan-out table (excluding owner-admin) has a matching key in
//      DEPRECATED_FAN_OUT_ROUTES. If someone adds a row to the doc but
//      forgets the map entry, this trips.
//
//   3. Every successor path in DEPRECATED_FAN_OUT_ROUTES is one of the 9
//      public endpoints from the contract (catches typos like 'op' vs 'ops').
//
//   4. matchDeprecatedRoute correctly strips the slug segment and returns
//      the right successor. Without this, the middleware silently no-ops
//      for every route and we get zero logs.
//
//   5. The middleware actually sets Deprecation/Link/X-Zoon-Successor-Op
//      headers + emits a [deprecated-route] log line when called against a
//      deprecated path, and does nothing for a public path.

import {
  DEPRECATED_FAN_OUT_ROUTES,
  attachDeprecationHints,
  matchDeprecatedRoute,
} from '../../server/deprecated-route-hints.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

// --- 1) Middleware wired to agentRoutes BEFORE first route ---

const agentRoutesSrc = readFileSync(path.join(repoRoot, 'server', 'agent-routes.ts'), 'utf8');
const useMiddlewareIdx = agentRoutesSrc.indexOf('agentRoutes.use(attachDeprecationHints)');
assert(
  useMiddlewareIdx !== -1,
  'agent-routes.ts must call agentRoutes.use(attachDeprecationHints)',
);
// First actual route defn uses .get/.post/.put/.delete with a path string
const firstRouteIdx = agentRoutesSrc.search(/\nagentRoutes\.(get|post|put|delete|patch)\(\s*['"]/);
assert(firstRouteIdx !== -1, 'Could not find any agentRoutes.<method> call — test is out of date');
assert(
  useMiddlewareIdx < firstRouteIdx,
  'attachDeprecationHints must be .use()d BEFORE the first route definition, otherwise early responses skip the header + log',
);

// --- 2) Every fan-out row in the contract doc has a map entry ---

const contractDoc = readFileSync(path.join(repoRoot, 'docs', 'ZOON_AGENT_CONTRACT.md'), 'utf8');
// Grab rows of the "Not in the contract" table — specifically the LHS cells
// that reference an `/:slug/...` path. Owner-admin paths are in a separate
// paragraph, not the table, so they won't match.
const notInContractStart = contractDoc.indexOf('## Not in the contract');
assert(notInContractStart !== -1, 'Could not find "Not in the contract" section in contract doc');
const notInContractEnd = contractDoc.indexOf('## ', notInContractStart + 5);
const notInContractSection = contractDoc.slice(notInContractStart, notInContractEnd);
// Scope the scan to the markdown table ONLY — the section also contains an
// "Owner-only admin" paragraph that mentions /quarantine, /repair, and
// /clone-from-canonical, but those are legitimate admin endpoints without a
// public successor, not fan-out aliases for /ops. They must NOT be in the
// deprecation map.
const tableStart = notInContractSection.indexOf('| Internal / deprecated');
assert(tableStart !== -1, 'Could not find fan-out table header in the "Not in the contract" section');
const ownerAdminStart = notInContractSection.indexOf('**Owner-only admin**');
const tableOnly = notInContractSection.slice(
  tableStart,
  ownerAdminStart === -1 ? notInContractSection.length : ownerAdminStart,
);
const docFanOutSuffixes = new Set<string>();
for (const m of tableOnly.matchAll(/`(?:GET|POST|PUT)\s+\/:slug\/([^`]+?)`/g)) {
  // m[1] is e.g. "marks/comment", "rewrite", "edit", "snapshot"
  docFanOutSuffixes.add(m[1]);
}
assert(docFanOutSuffixes.size >= 10, `Expected ≥10 fan-out rows in doc, got ${docFanOutSuffixes.size}`);
for (const suffix of docFanOutSuffixes) {
  assert(
    suffix in DEPRECATED_FAN_OUT_ROUTES,
    `Contract doc lists /:slug/${suffix} as a fan-out alias but it's missing from DEPRECATED_FAN_OUT_ROUTES — add the entry or the middleware won't tag it`,
  );
}
// Reverse: every map key must show up in the doc table (no orphan map entries)
for (const key of Object.keys(DEPRECATED_FAN_OUT_ROUTES)) {
  assert(
    docFanOutSuffixes.has(key),
    `DEPRECATED_FAN_OUT_ROUTES has "${key}" but no matching row in the contract doc — add it to the "Not in the contract" table or delete the map entry`,
  );
}

// --- 3) Every successorPath is one of the 9 public endpoints ---

const PUBLIC_SUCCESSORS = new Set([
  '/api/agent/:slug/ops',
  '/api/agent/:slug/edit/v2',
  '/api/agent/:slug/state',
  '/api/agent/:slug/presence',
  '/api/agent/:slug/events/pending',
  '/api/agent/:slug/events/ack',
  '/api/agent/bug-reports',
  '/api/public/documents',
  '/skill',
]);
for (const [key, { successorPath }] of Object.entries(DEPRECATED_FAN_OUT_ROUTES)) {
  assert(
    PUBLIC_SUCCESSORS.has(successorPath),
    `DEPRECATED_FAN_OUT_ROUTES.${key}.successorPath = "${successorPath}" is not one of the 9 public endpoints — typo or stale`,
  );
}

// --- 4) matchDeprecatedRoute strips slug correctly ---

const matched = matchDeprecatedRoute('/h0j9vpdf/marks/comment');
assert(matched !== null, 'Expected /h0j9vpdf/marks/comment to match');
assert.equal(matched.key, 'marks/comment');
assert.equal(matched.successor.opType, 'comment.add');

const matchedRewrite = matchDeprecatedRoute('/abc123/rewrite');
assert(matchedRewrite !== null, 'Expected /abc123/rewrite to match');
assert.equal(matchedRewrite.key, 'rewrite');
assert.equal(matchedRewrite.successor.opType, 'rewrite.apply');

// Public routes must NOT match
for (const publicPath of ['/h0j9vpdf/state', '/h0j9vpdf/ops', '/h0j9vpdf/presence', '/h0j9vpdf/events/pending']) {
  assert(
    matchDeprecatedRoute(publicPath) === null,
    `Public route ${publicPath} incorrectly matched as deprecated`,
  );
}

// --- 5) Middleware sets headers + logs for deprecated; does nothing for public ---

type MockRes = {
  headers: Record<string, string>;
  setHeader: (k: string, v: string) => void;
};
type MockReq = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  header: (name: string) => string | undefined;
};
function mockReq(path: string, headers: Record<string, string> = {}): MockReq {
  const slug = path.split('/').filter(Boolean)[0] ?? '';
  return {
    method: 'POST',
    path,
    params: { slug },
    query: {},
    header: (name) => headers[name.toLowerCase()],
  };
}
function mockRes(): MockRes {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader(k: string, v: string) { headers[k] = v; },
  };
}
function captureLog(fn: () => void): string[] {
  const original = console.log;
  const captured: string[] = [];
  console.log = (...args: unknown[]) => {
    captured.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return captured;
}

// 5a) Deprecated path → headers + log
{
  const req = mockReq('/h0j9vpdf/marks/comment', {
    'x-agent-id': 'claude-42',
    'user-agent': 'test-agent/1.0',
    'x-share-token': 'secret-token',
  });
  const res = mockRes();
  let calledNext = false;
  const logs = captureLog(() => {
    attachDeprecationHints(req as never, res as never, () => { calledNext = true; });
  });
  assert(calledNext, 'Middleware must call next() to let the handler run');
  assert.equal(res.headers['Deprecation'], 'true');
  assert(res.headers['Link']?.includes('/api/agent/h0j9vpdf/ops'), `Expected Link header to point at slug-interpolated /ops, got: ${res.headers['Link']}`);
  assert(res.headers['Link']?.includes('rel="successor-version"'), 'Link header must include rel="successor-version"');
  assert.equal(res.headers['X-Zoon-Successor-Op'], 'comment.add');
  assert.equal(logs.length, 1, 'Expected exactly one [deprecated-route] log line');
  assert(logs[0].startsWith('[deprecated-route]'), `Log line must start with the tag, got: ${logs[0]}`);
  // Log line must NOT contain the raw share token
  assert(!logs[0].includes('secret-token'), 'Log must never contain the raw share token');
  // Log line must contain agentId, slug, route
  assert(logs[0].includes('claude-42'), 'Log must include agentId');
  assert(logs[0].includes('h0j9vpdf'), 'Log must include slug');
  assert(logs[0].includes('marks/comment'), 'Log must include route suffix');
}

// 5b) Public path → no headers, no log
{
  const req = mockReq('/h0j9vpdf/state', { 'x-agent-id': 'claude-42' });
  const res = mockRes();
  let calledNext = false;
  const logs = captureLog(() => {
    attachDeprecationHints(req as never, res as never, () => { calledNext = true; });
  });
  assert(calledNext, 'Public route must still call next()');
  assert.equal(res.headers['Deprecation'], undefined, 'Public route must not set Deprecation header');
  assert.equal(res.headers['Link'], undefined);
  assert.equal(res.headers['X-Zoon-Successor-Op'], undefined);
  assert.equal(logs.length, 0, 'Public route must not emit [deprecated-route] log');
}

console.log('✓ Deprecation middleware is wired, tags fan-out routes, leaves public routes alone');
