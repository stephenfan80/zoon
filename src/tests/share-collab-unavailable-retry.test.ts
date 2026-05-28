import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getShareCollabUnavailableRecovery } from '../editor/share-collab-unavailable-retry.js';

const retryAfter = getShareCollabUnavailableRecovery({
  collabAvailable: false,
  code: 'COLLAB_ADMISSION_GUARDED',
  retryAfterMs: 42_000,
});

assert.equal(retryAfter.retryable, true, 'Expected retryAfterMs collab unavailability to be retryable');
assert.equal(retryAfter.retryDelayMs, 42_000, 'Expected retryAfterMs to drive the auto-retry delay');
assert.match(retryAfter.message, /read-only copy/i, 'Expected retry message to explain read-only fallback');
assert.match(retryAfter.message, /retrying in 42s/i, 'Expected retry message to show delay');

const retryableCode = getShareCollabUnavailableRecovery({
  collabAvailable: false,
  code: 'collab_admission_guarded',
});

assert.equal(retryableCode.retryable, true, 'Expected admission-guarded collab unavailability to be retryable');
assert.equal(retryableCode.retryDelayMs, 15_000, 'Expected retryable codes without retryAfterMs to use the default delay');

const durableBlock = getShareCollabUnavailableRecovery({
  collabAvailable: false,
  code: 'COLLAB_AUTO_QUARANTINED',
});

assert.equal(durableBlock.retryable, false, 'Expected durable collab blocks without retryAfterMs not to auto-retry');
assert.equal(durableBlock.retryDelayMs, null, 'Expected durable collab blocks not to schedule a retry');
assert.match(durableBlock.message, /retry when the document has recovered/i, 'Expected durable message to keep manual retry available');

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/index.ts'), 'utf8');

assert(
  editorSource.includes('const contextUnavailable = context?.collabAvailable === false'),
  'Expected initFromShare to preserve open-context collabAvailable=false details',
);
assert(
  editorSource.includes('this.handleInitialCollabUnavailable(collabSession, doc, options, preserveCurrentDocument);'),
  'Expected initFromShare to route unavailable collab sessions through recovery handling',
);
assert(
  editorSource.includes('this.loadDocument(contentWithMarks);'),
  'Expected unavailable collab handling to load a read-only document copy',
);
assert(
  editorSource.includes('this.shareInitRetryTimer = setTimeout(() => {'),
  'Expected unavailable collab handling to schedule automatic retry',
);
assert(
  editorSource.includes("retryLabel: 'Retry now'"),
  'Expected unavailable collab handling to expose a manual retry button',
);
assert(
  !editorSource.includes("this.showErrorBanner('Live collaboration is currently unavailable for this shared document.');"),
  'Expected initial collab unavailability not to become a permanent red banner',
);

console.log('✓ share collab temporary unavailability falls back to read-only and retries');
