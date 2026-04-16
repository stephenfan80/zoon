import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as Y from 'yjs';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  const dbName = `proof-agent-edit-v2-detached-live-doc-${Date.now()}-${randomUUID()}.db`;
  const dbPath = path.join(os.tmpdir(), dbName);
  process.env.DATABASE_PATH = dbPath;

  const db = await import('../../server/db.ts');
  const collab = await import('../../server/collab.ts');
  const canonical = await import('../../server/canonical-document.ts');

  const slug = `detached-live-doc-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const created = db.createDocument(
      slug,
      '# Detached live doc\n\nBase paragraph.',
      {},
      'detached live doc regression',
    );
    assert(typeof created.access_epoch === 'number', 'Expected test document to have access_epoch');

    await collab.startCollabRuntimeEmbedded(4000);

    const instance = collab.__unsafeGetHocuspocusInstanceForTests() as {
      openDirectConnection?: (documentName: string, context?: unknown) => Promise<unknown>;
      documents?: Map<string, unknown>;
    } | null;
    assert(instance && typeof instance.openDirectConnection === 'function', 'Expected hocuspocus test instance');

    db.noteDocumentLiveCollabLease(slug, created.access_epoch);

    const originalOpenDirectConnection = instance.openDirectConnection;
    instance.openDirectConnection = async () => ({
      document: new Y.Doc(),
      disconnect: () => undefined,
    });

    const result = await canonical.mutateCanonicalDocument({
      slug,
      nextMarkdown: '# Detached live doc\n\nBase paragraph.\n\nAPI append.',
      nextMarks: {},
      source: 'ai:detached-live-doc-regression',
      baseRevision: created.revision,
      strictLiveDoc: true,
    });

    instance.openDirectConnection = originalOpenDirectConnection;

    // A bare documentLease without any real WS connection is a ghost lease
    // (exactEpochCount === 0 && anyEpochCount === 0). Writes must fall back to
    // the persisted Yjs doc rather than 409 LIVE_DOC_UNAVAILABLE — there is no
    // live client to coordinate with.
    assert(result.ok, `Expected ghost-lease mutation to succeed via persisted fallback: ${JSON.stringify(result)}`);

    const row = db.getDocumentBySlug(slug);
    assert(Boolean(row), 'Expected document row after mutation');
    assert(
      row?.markdown.includes('API append.'),
      `Expected persisted canonical markdown to include the appended paragraph. markdown=${String(row?.markdown)}`,
    );

    console.log('✓ strict live-doc mutations fall back to persisted when only a ghost lease is present');
  } finally {
    await collab.stopCollabRuntime();
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        unlinkSync(`${dbPath}${suffix}`);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
