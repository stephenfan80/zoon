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

function hasPendingSuggestion(marks: Record<string, Record<string, unknown>>): boolean {
  return Object.values(marks).some((mark) => {
    return (mark.kind === 'replace' || mark.kind === 'delete' || mark.kind === 'insert') && mark.status === 'pending';
  });
}

async function run(): Promise<void> {
  const dbName = `zoon-edit-v2-proof-aligned-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
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
  const { executeDocumentOperationAsync } = await import('../../server/document-engine.ts');
  const { __setBeforeCanonicalApplyHookForTests } = await import('../../server/canonical-document.ts');

  try {
    const humanSlug = `human-direct-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      humanSlug,
      ['# Old Title', '', 'Human paragraph.'].join('\n'),
      {
        'authored:human:stephen:title': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Old Title',
          startRel: 'char:2',
          endRel: 'char:11',
        },
      },
      'Proof-aligned direct edit test',
    );

    let doc = db.getDocumentBySlug(humanSlug)!;
    const directReplace = await applyAgentEditV2(humanSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [
        { op: 'replace_block', ref: 'b1', block: { markdown: '# New Title' } },
      ],
    });

    assert(directReplace.status === 200, `Expected direct replace 200, got ${directReplace.status}`);
    assert(directReplace.body.marksOnly !== true, 'Expected direct edit, not marks-only suggestion response');
    assert(!directReplace.body.protectedSuggestions, 'Expected no protectedSuggestions response');

    doc = db.getDocumentBySlug(humanSlug)!;
    assert(doc.markdown.includes('New Title'), `Expected human-authored heading to be replaced directly, got ${doc.markdown}`);
    assert(doc.markdown.includes('data-by="ai:test"'), 'Expected direct replacement to carry the AI author');
    assert(!doc.markdown.includes('Old Title'), 'Expected old heading text to be removed immediately');
    let marks = parseMarks(doc.marks);
    assert(!hasPendingSuggestion(marks), 'Expected no pending replacement/delete/insert mark after direct edit');

    const directSnapshot = directReplace.body.snapshot as { marks?: Record<string, Record<string, unknown>> } | undefined;
    assert(
      Boolean(directSnapshot?.marks && Object.values(directSnapshot.marks).some((mark) => mark.kind === 'authored' && mark.by === 'ai:test')),
      'Expected direct AI edit snapshot to expose an AI authored mark',
    );

    const retrySlug = `retry-canonical-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(retrySlug, '# Retry\n\nOriginal paragraph.', {}, 'Canonical retryWithState regression');
    const retryBase = db.getDocumentBySlug(retrySlug)!;
    let hookCalls = 0;
    __setBeforeCanonicalApplyHookForTests(({ slug }) => {
      if (slug !== retrySlug || hookCalls > 0) return;
      hookCalls += 1;
      const changed = db.updateDocument(retrySlug, '# Retry\n\nConcurrent human content.');
      assert(changed, 'Expected concurrent update hook to advance document revision');
    });
    const retryResult = await applyAgentEditV2(retrySlug, {
      by: 'ai:test',
      baseRevision: retryBase.revision,
      operations: [
        { op: 'replace_block', ref: 'b2', block: { markdown: 'Agent replacement that must not land.' } },
      ],
    });
    __setBeforeCanonicalApplyHookForTests(null);

    assert(hookCalls === 1, `Expected canonical apply hook to run once, got ${hookCalls}`);
    assert(retryResult.status === 409, `Expected stale fallback 409, got ${retryResult.status}`);
    assert(retryResult.body.code === 'STALE_BASE', `Expected STALE_BASE, got ${String(retryResult.body.code)}`);
    assert(
      retryResult.body.retryWithState === `/documents/${retrySlug}/state`,
      `Expected canonical retryWithState, got ${String(retryResult.body.retryWithState)}`,
    );
    assert(
      !JSON.stringify(retryResult.body).includes(`/api/agent/${retrySlug}/state`),
      'Expected edit/v2 fallback error response not to leak legacy /api/agent retryWithState',
    );
    doc = db.getDocumentBySlug(retrySlug)!;
    assert(doc.markdown.includes('Concurrent human content.'), 'Expected concurrent document content to remain');
    assert(!doc.markdown.includes('Agent replacement that must not land.'), 'Expected failed agent edit not to overwrite concurrent content');

    const invalidAuthorSlug = `invalid-author-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      invalidAuthorSlug,
      ['# Guarded', '', 'Do not mutate.'].join('\n'),
      {
        'authored:human:stephen:guarded': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Guarded',
          startRel: 'char:2',
          endRel: 'char:9',
        },
      },
      'Invalid edit/v2 author test',
    );
    const beforeInvalid = db.getDocumentBySlug(invalidAuthorSlug)!;
    const invalidAuthorBodies: Array<Record<string, unknown>> = [
      {
        baseRevision: beforeInvalid.revision,
        operations: [{ op: 'insert_after', ref: 'b1', blocks: [{ markdown: 'Should not land.' }] }],
      },
      {
        by: '',
        baseRevision: beforeInvalid.revision,
        operations: [{ op: 'insert_after', ref: 'b1', blocks: [{ markdown: 'Should not land.' }] }],
      },
      {
        by: 'human:stephen',
        baseRevision: beforeInvalid.revision,
        operations: [{ op: 'insert_after', ref: 'b1', blocks: [{ markdown: 'Should not land.' }] }],
      },
      {
        by: 'qa:test',
        baseRevision: beforeInvalid.revision,
        operations: [{ op: 'insert_after', ref: 'b1', blocks: [{ markdown: 'Should not land.' }] }],
      },
      {
        by: 'ai:',
        baseRevision: beforeInvalid.revision,
        operations: [{ op: 'insert_after', ref: 'b1', blocks: [{ markdown: 'Should not land.' }] }],
      },
    ];
    for (const invalidBody of invalidAuthorBodies) {
      const invalid = await applyAgentEditV2(invalidAuthorSlug, invalidBody);
      assert(invalid.status === 400, `Expected invalid author 400, got ${invalid.status}`);
      assert(invalid.body.code === 'INVALID_AUTHOR', `Expected INVALID_AUTHOR, got ${String(invalid.body.code)}`);
      const afterInvalid = db.getDocumentBySlug(invalidAuthorSlug)!;
      assert(afterInvalid.markdown === beforeInvalid.markdown, 'Expected invalid author to leave markdown unchanged');
      assert(afterInvalid.revision === beforeInvalid.revision, 'Expected invalid author to leave revision unchanged');
      assert(afterInvalid.marks === beforeInvalid.marks, 'Expected invalid author to leave marks unchanged');
    }

    const deleteSlug = `human-delete-direct-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      deleteSlug,
      ['# Keep Title', '', 'Human paragraph.'].join('\n'),
      {
        'authored:human:stephen:paragraph': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Human paragraph.',
          startRel: 'char:14',
          endRel: 'char:30',
        },
      },
      'Proof-aligned direct delete test',
    );
    doc = db.getDocumentBySlug(deleteSlug)!;
    const directDelete = await applyAgentEditV2(deleteSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [{ op: 'delete_block', ref: 'b2' }],
    });
    assert(directDelete.status === 200, `Expected direct delete 200, got ${directDelete.status}`);
    doc = db.getDocumentBySlug(deleteSlug)!;
    assert(!doc.markdown.includes('Human paragraph.'), 'Expected human-authored paragraph to be deleted directly');
    marks = parseMarks(doc.marks);
    assert(!hasPendingSuggestion(marks), 'Expected no pending delete suggestion after direct delete');

    const mixedSlug = `human-mixed-direct-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      mixedSlug,
      'Human paragraph.',
      {
        'authored:human:stephen:mixed': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Human paragraph.',
          startRel: 'char:0',
          endRel: 'char:16',
        },
      },
      'Proof-aligned mixed direct batch test',
    );
    doc = db.getDocumentBySlug(mixedSlug)!;
    const mixed = await applyAgentEditV2(mixedSlug, {
      by: 'ai:test',
      baseRevision: doc.revision,
      operations: [
        { op: 'replace_block', ref: 'b1', block: { markdown: 'AI replacement.' } },
        { op: 'insert_after', ref: 'b1', blocks: [{ markdown: 'New AI note.' }] },
      ],
    });
    assert(mixed.status === 200, `Expected mixed direct batch 200, got ${mixed.status}`);
    doc = db.getDocumentBySlug(mixedSlug)!;
    assert(doc.markdown.includes('AI replacement.'), 'Expected direct replacement to land in mixed batch');
    assert(doc.markdown.includes('New AI note.'), 'Expected direct insert to land in mixed batch');
    marks = parseMarks(doc.marks);
    assert(!hasPendingSuggestion(marks), 'Expected no pending suggestions after mixed direct batch');

    const suggestionSlug = `human-opt-in-suggestion-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(
      suggestionSlug,
      'Keep this sentence.',
      {
        'authored:human:stephen:suggestion': {
          kind: 'authored',
          by: 'human:stephen',
          createdAt: new Date().toISOString(),
          quote: 'Keep this sentence.',
          startRel: 'char:0',
          endRel: 'char:19',
        },
      },
      'Opt-in suggestion test',
    );
    const suggestion = await executeDocumentOperationAsync(suggestionSlug, 'POST', '/marks/suggest-replace', {
      by: 'ai:test',
      quote: 'Keep this sentence.',
      content: 'Suggested sentence.',
    });
    assert(suggestion.status === 200, `Expected opt-in suggestion 200, got ${suggestion.status}`);
    doc = db.getDocumentBySlug(suggestionSlug)!;
    assert(doc.markdown.includes('Keep this sentence.'), 'Expected opt-in suggestion to leave markdown unchanged before accept');
    assert(!doc.markdown.includes('Suggested sentence.'), 'Expected suggestion content to stay out of markdown before accept');
    marks = parseMarks(doc.marks);
    const suggestionEntry = Object.entries(marks).find(([, mark]) => mark.kind === 'replace' && mark.status === 'pending');
    assert(Boolean(suggestionEntry), 'Expected explicit suggestion.add to create a pending replace mark');
    const [suggestionId, suggestionMark] = suggestionEntry!;
    assert(suggestionMark.by === 'ai:test', 'Expected suggestion author to be the agent');
    assert(suggestionMark.content === 'Suggested sentence.', 'Expected suggestion content to be stored on the mark');

    const accepted = await executeDocumentOperationAsync(suggestionSlug, 'POST', '/marks/accept', {
      by: 'human:stephen',
      markId: suggestionId,
    });
    assert(accepted.status === 200, `Expected suggestion accept 200, got ${accepted.status}`);
    doc = db.getDocumentBySlug(suggestionSlug)!;
    assert(doc.markdown.includes('Suggested sentence.'), 'Expected accepted suggestion to update markdown');
    assert(!doc.markdown.includes('Keep this sentence.'), 'Expected accepted suggestion to remove original text');

    const rejectSlug = `human-opt-in-reject-${Math.random().toString(36).slice(2, 10)}`;
    db.createDocument(rejectSlug, 'Keep me.', {}, 'Opt-in suggestion reject test');
    const rejectSuggestion = await executeDocumentOperationAsync(rejectSlug, 'POST', '/marks/suggest-replace', {
      by: 'ai:test',
      quote: 'Keep me.',
      content: 'Discard me.',
    });
    assert(rejectSuggestion.status === 200, `Expected reject setup 200, got ${rejectSuggestion.status}`);
    marks = parseMarks(db.getDocumentBySlug(rejectSlug)!.marks);
    const rejectEntry = Object.entries(marks).find(([, mark]) => mark.kind === 'replace' && mark.status === 'pending');
    assert(Boolean(rejectEntry), 'Expected pending suggestion before reject');
    const rejected = await executeDocumentOperationAsync(rejectSlug, 'POST', '/marks/reject', {
      by: 'human:stephen',
      markId: rejectEntry![0],
    });
    assert(rejected.status === 200, `Expected suggestion reject 200, got ${rejected.status}`);
    doc = db.getDocumentBySlug(rejectSlug)!;
    assert(doc.markdown.includes('Keep me.'), 'Expected rejected suggestion to preserve original text');
    assert(!doc.markdown.includes('Discard me.'), 'Expected rejected suggestion not to enter markdown');

    console.log('✓ agent edit v2 aligns with Proof-style direct edits and opt-in suggestions');
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

    try {
      __setBeforeCanonicalApplyHookForTests(null);
    } catch {
      // Module import may have failed before the hook helper was initialized.
    }

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
