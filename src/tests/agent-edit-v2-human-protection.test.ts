import { unlinkSync } from 'node:fs';
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
  const dbName = `zoon-edit-v2-human-protection-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  const dbPath = path.join(os.tmpdir(), dbName);

  const prevDatabasePath = process.env.DATABASE_PATH;
  const prevProofEnv = process.env.PROOF_ENV;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDbEnvInit = process.env.PROOF_DB_ENV_INIT;

  process.env.DATABASE_PATH = dbPath;
  process.env.PROOF_ENV = 'development';
  process.env.NODE_ENV = 'development';
  delete process.env.PROOF_DB_ENV_INIT;

  const db = await import('../../server/db.ts');
  const { applyAgentEditV2 } = await import('../../server/agent-edit-v2.ts');
  const { executeDocumentOperationAsync } = await import('../../server/document-engine.ts');

  try {
    const humanSlug = `human-protect-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      humanSlug,
      ['# Old Title', '', 'AI paragraph.'].join('\n'),
      {
        'authored:human:stephen:1-10': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Old Title',
          startRel: 'char:0',
          endRel: 'char:9',
        },
      },
      'Human protection test',
    );

    let doc = db.getDocumentBySlug(humanSlug)!;
    const protectedReplace = await applyAgentEditV2(humanSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [
        { op: 'replace_block', ref: 'b1', block: { markdown: '# New Title' } },
      ],
    });

    assert(protectedReplace.status === 200, `Expected protected replace 200, got ${protectedReplace.status}`);
    assert((protectedReplace.body.protectedSuggestions as { created?: number } | undefined)?.created === 1, 'Expected one protected suggestion');

    doc = db.getDocumentBySlug(humanSlug)!;
    assert(doc.markdown.startsWith('# Old Title'), 'Expected human markdown to remain unchanged before confirmation');
    assert(!doc.markdown.includes('# New Title'), 'Expected AI replacement to stay out of markdown before confirmation');

    let marks = parseMarks(doc.marks);
    const replacementEntry = Object.entries(marks).find(([, mark]) => mark.kind === 'replace');
    assert(Boolean(replacementEntry), 'Expected pending replace mark');
    const [replacementId, replacementMark] = replacementEntry!;
    assert(replacementMark.by === 'ai:test', 'Expected replacement author to be the agent');
    assert(replacementMark.status === 'pending', 'Expected replacement to be pending');
    assert(replacementMark.content === '# New Title', 'Expected block markdown replacement content');
    assert(replacementMark.contentMode === 'block_markdown', 'Expected block markdown content mode');

    const accepted = await executeDocumentOperationAsync(humanSlug, 'POST', '/marks/accept', {
      markId: replacementId,
      by: 'human:stephen',
    });
    assert(accepted.status === 200, `Expected accept 200, got ${accepted.status}`);
    doc = db.getDocumentBySlug(humanSlug)!;
    assert(doc.markdown.includes('New Title'), `Expected accepted replacement to include new heading text, got ${doc.markdown}`);
    assert(!doc.markdown.includes('Old Title'), 'Expected accepted replacement to remove the old heading text');
    assert(!doc.markdown.startsWith('# # New Title'), 'Expected block markdown accept not to double-wrap heading syntax');

    const rejectSlug = `human-reject-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      rejectSlug,
      ['# Keep Title', '', 'Human body.'].join('\n'),
      {
        'authored:human:stephen:reject': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Keep Title',
          startRel: 'char:0',
          endRel: 'char:12',
        },
      },
      'Human reject protection test',
    );
    doc = db.getDocumentBySlug(rejectSlug)!;
    const rejectedReplace = await applyAgentEditV2(rejectSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [
        { op: 'replace_block', ref: 'b1', block: { markdown: '# Discarded Title' } },
      ],
    });
    assert(rejectedReplace.status === 200, `Expected protected reject setup 200, got ${rejectedReplace.status}`);
    marks = parseMarks(db.getDocumentBySlug(rejectSlug)!.marks);
    const rejectedEntry = Object.entries(marks).find(([, mark]) => mark.kind === 'replace');
    assert(Boolean(rejectedEntry), 'Expected pending replace mark before reject');
    const [rejectedId] = rejectedEntry!;
    const rejected = await executeDocumentOperationAsync(rejectSlug, 'POST', '/marks/reject', {
      markId: rejectedId,
      by: 'human:stephen',
    });
    assert(rejected.status === 200, `Expected reject 200, got ${rejected.status}`);
    doc = db.getDocumentBySlug(rejectSlug)!;
    assert(doc.markdown.includes('Keep Title'), 'Expected reject to preserve original human title');
    assert(!doc.markdown.includes('Discarded Title'), 'Expected reject to remove AI replacement content');
    marks = parseMarks(doc.marks);
    assert(!Object.values(marks).some((mark) => mark.kind === 'replace' && mark.status === 'pending'), 'Expected no pending replace after reject');

    const deleteSlug = `human-delete-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      deleteSlug,
      'Human paragraph.',
      {
        'authored:human:stephen:1-17': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Human paragraph.',
          startRel: 'char:0',
          endRel: 'char:16',
        },
      },
      'Human delete protection test',
    );
    doc = db.getDocumentBySlug(deleteSlug)!;
    const protectedDelete = await applyAgentEditV2(deleteSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [{ op: 'delete_block', ref: 'b1' }],
    });
    assert(protectedDelete.status === 200, `Expected protected delete 200, got ${protectedDelete.status}`);
    doc = db.getDocumentBySlug(deleteSlug)!;
    assert(doc.markdown.trim() === 'Human paragraph.', 'Expected human delete to leave markdown unchanged before confirmation');
    marks = parseMarks(doc.marks);
    assert(Object.values(marks).some((mark) => mark.kind === 'delete' && mark.status === 'pending'), 'Expected pending delete suggestion');

    const mixedSlug = `human-mixed-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      mixedSlug,
      'Human paragraph.',
      {
        'authored:human:stephen:1-17': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Human paragraph.',
          startRel: 'char:0',
          endRel: 'char:16',
        },
      },
      'Human mixed batch test',
    );
    doc = db.getDocumentBySlug(mixedSlug)!;
    const mixed = await applyAgentEditV2(mixedSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [
        { op: 'replace_block', ref: 'b1', block: { markdown: 'AI replacement.' } },
        { op: 'insert_at_end', markdown: 'New AI note.' },
      ],
    });
    assert(mixed.status === 409, `Expected mixed protected/direct batch 409, got ${mixed.status}`);
    assert(mixed.body.code === 'PROTECTED_EDIT_MIXED_BATCH', 'Expected protected mixed batch error code');

    const aiSlug = `ai-direct-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(aiSlug, '# AI Draft', {}, 'AI direct test');
    doc = db.getDocumentBySlug(aiSlug)!;
    const directAi = await applyAgentEditV2(aiSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [
        { op: 'replace_block', ref: 'b1', block: { markdown: '# AI Rewrite' } },
      ],
    });
    assert(directAi.status === 200, `Expected AI/unmarked direct write 200, got ${directAi.status}`);
    doc = db.getDocumentBySlug(aiSlug)!;
    assert(doc.markdown.startsWith('# AI Rewrite'), 'Expected AI/unmarked content to be replaced directly');
    const directSnapshot = directAi.body.snapshot as { marks?: Record<string, Record<string, unknown>> } | undefined;
    assert(
      Boolean(directSnapshot?.marks && Object.values(directSnapshot.marks).some((mark) => mark.kind === 'authored' && mark.by === 'ai:test')),
      'Expected direct AI edit snapshot to expose an AI authored mark',
    );

    console.log('✓ agent edit v2 protects human-authored edits with confirmable suggestions');
  } finally {
    if (prevDatabasePath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = prevDatabasePath;

    if (prevProofEnv === undefined) delete process.env.PROOF_ENV;
    else process.env.PROOF_ENV = prevProofEnv;

    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;

    if (prevDbEnvInit === undefined) delete process.env.PROOF_DB_ENV_INIT;
    else process.env.PROOF_DB_ENV_INIT = prevDbEnvInit;

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
