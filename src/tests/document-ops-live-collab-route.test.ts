import { readFileSync } from 'fs';
import { strict as assert } from 'assert';

const routesSource = readFileSync(new URL('../../server/routes.ts', import.meta.url), 'utf8');
const engineSource = readFileSync(new URL('../../server/document-engine.ts', import.meta.url), 'utf8');

const routeStart = routesSource.indexOf("apiRoutes.post('/documents/:slug/ops'");
assert(routeStart >= 0, 'Expected canonical /documents/:slug/ops route');
const routeEnd = routesSource.indexOf('async function deleteDocumentAsOwner', routeStart);
assert(routeEnd > routeStart, 'Expected /documents/:slug/ops route to end before delete helper');
const opsRoute = routesSource.slice(routeStart, routeEnd);

assert(
  !opsRoute.includes('source: \'rest-ops\''),
  'Canonical /documents/:slug/ops must not use a full rest-ops markdown re-apply after marks-only mutations',
);
assert(
  !opsRoute.includes('applyCanonicalDocumentToCollab(slug'),
  'Canonical /documents/:slug/ops must not re-apply full canonical markdown after operation engine success',
);
assert(
  !opsRoute.includes('markdown: typeof updatedDoc.markdown'),
  'Canonical /documents/:slug/ops must not push derived markdown back into a live collab room',
);
assert(
  opsRoute.includes('applyDocumentOpParticipationToCollab(slug, participation)'),
  'Canonical /documents/:slug/ops should still surface agent presence/cursor hints after metadata ops',
);

assert(
  engineSource.includes('syncCanonicalDocumentStateToCollab(slug, {\n      marks: nextMarks'),
  'Document engine should own marks-only collab sync for comment and pending suggestion operations',
);
assert(
  engineSource.includes('source: `engine:${eventType}:${actor}`'),
  'Document engine should own canonical content sync for suggestion accept/reject operations',
);

console.log('✓ canonical /documents/:slug/ops does not full-reseed live collab after metadata ops');
