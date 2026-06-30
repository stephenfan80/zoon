import { unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function parseMarks(raw: string): Record<string, Record<string, unknown>> {
  const parsed = JSON.parse(raw || '{}');
  assert(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Expected marks object');
  return parsed as Record<string, Record<string, unknown>>;
}

async function run(): Promise<void> {
  const dbName = `zoon-edit-v2-collab-anchor-${Date.now()}-${randomUUID()}.db`;
  const dbPath = path.join(os.tmpdir(), dbName);

  const prevDatabasePath = process.env.DATABASE_PATH;
  const prevProofEnv = process.env.PROOF_ENV;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDbEnvInit = process.env.PROOF_DB_ENV_INIT;
  const prevSingleWriterEdit = process.env.COLLAB_SINGLE_WRITER_EDIT;

  process.env.DATABASE_PATH = dbPath;
  process.env.PROOF_ENV = 'development';
  process.env.NODE_ENV = 'development';
  process.env.COLLAB_SINGLE_WRITER_EDIT = '0';
  delete process.env.PROOF_DB_ENV_INIT;

  const db = await import('../../server/db.ts');
  const { applyAgentEditV2 } = await import('../../server/agent-edit-v2.ts');

  try {
    const protectedSlug = `protected-comment-${randomUUID()}`;
    db.createDocument(
      protectedSlug,
      [
        'Intro paragraph.',
        '',
        '<span data-proof="comment" data-id="c1" data-by="human:test">Commented paragraph.</span>',
        '',
        'Tail paragraph.',
      ].join('\n'),
      {
        c1: {
          kind: 'comment',
          by: 'human:test',
          createdAt: new Date().toISOString(),
          quote: 'Commented paragraph.',
          text: '@zoon make this shorter',
          threadId: 't1',
          resolved: false,
        },
      },
      'Protected comment anchor test',
    );

    const protectedDoc = db.getDocumentBySlug(protectedSlug)!;
    const blocked = await applyAgentEditV2(protectedSlug, {
      by: 'ai:test',
      baseRevision: protectedDoc.revision,
      operations: [
        { op: 'replace_block', ref: 'b2', block: { markdown: 'Short replacement.' } },
      ],
    });

    assert(blocked.status === 409, `Expected protected replace_block 409, got ${blocked.status}`);
    assert(blocked.body.code === 'COLLAB_ANCHOR_PROTECTED', `Expected COLLAB_ANCHOR_PROTECTED, got ${String(blocked.body.code)}`);
    const afterBlocked = db.getDocumentBySlug(protectedSlug)!;
    assert(afterBlocked.revision === protectedDoc.revision, 'Expected blocked edit to leave revision unchanged');
    assert(afterBlocked.markdown.includes('Commented paragraph.'), 'Expected blocked edit to leave commented text unchanged');

    const flaggedSlug = `flagged-direct-${randomUUID()}`;
    db.createDocument(
      flaggedSlug,
      'Needs attention but can be edited.',
      {
        f1: {
          kind: 'flagged',
          by: 'human:test',
          createdAt: new Date().toISOString(),
          quote: 'Needs attention but can be edited.',
        },
      },
      'Flagged reading mark direct edit test',
    );
    const flaggedBase = db.getDocumentBySlug(flaggedSlug)!;
    const flaggedEdit = await applyAgentEditV2(flaggedSlug, {
      by: 'ai:test',
      baseRevision: flaggedBase.revision,
      operations: [
        { op: 'replace_block', ref: 'b1', block: { markdown: 'Edited despite reading mark.' } },
      ],
    });
    assert(flaggedEdit.status === 200, `Expected flagged replace_block 200, got ${flaggedEdit.status}`);
    const flaggedAfter = db.getDocumentBySlug(flaggedSlug)!;
    assert(flaggedAfter.markdown.includes('Edited despite reading mark.'), 'Expected flagged reading mark not to block direct edit');

    const authoredSlug = `authored-replace-${randomUUID()}`;
    db.createDocument(
      authoredSlug,
      [
        '<span data-proof="authored" data-by="ai:seed">Seed paragraph.</span>',
        '',
        'Plain paragraph.',
      ].join('\n'),
      {},
      'AI authored replacement test',
    );

    const authoredBase = db.getDocumentBySlug(authoredSlug)!;
    const replaced = await applyAgentEditV2(authoredSlug, {
      by: 'ai:test',
      baseRevision: authoredBase.revision,
      operations: [
        { op: 'replace_block', ref: 'b2', block: { markdown: 'Replacement paragraph.' } },
      ],
    });

    assert(replaced.status === 200, `Expected authored replace_block 200, got ${replaced.status}`);
    const afterReplace = db.getDocumentBySlug(authoredSlug)!;
    assert(afterReplace.markdown.includes('data-proof="authored"'), 'Expected stored markdown to keep authored spans');
    assert(afterReplace.markdown.includes('data-by="ai:test"'), 'Expected replacement markdown to carry the AI author');

    const marks = parseMarks(afterReplace.marks);
    assert(
      Object.values(marks).some((mark) => (
        mark.kind === 'authored'
        && mark.by === 'ai:test'
        && mark.quote === 'Replacement paragraph.'
      )),
      'Expected replacement block to expose an ai:test authored mark',
    );

    console.log('✓ edit/v2 protects collaboration anchors and preserves AI authorship');
  } finally {
    if (prevDatabasePath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = prevDatabasePath;

    if (prevProofEnv === undefined) delete process.env.PROOF_ENV;
    else process.env.PROOF_ENV = prevProofEnv;

    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;

    if (prevDbEnvInit === undefined) delete process.env.PROOF_DB_ENV_INIT;
    else process.env.PROOF_DB_ENV_INIT = prevDbEnvInit;

    if (prevSingleWriterEdit === undefined) delete process.env.COLLAB_SINGLE_WRITER_EDIT;
    else process.env.COLLAB_SINGLE_WRITER_EDIT = prevSingleWriterEdit;

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
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
