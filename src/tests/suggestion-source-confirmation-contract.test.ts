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

function findPendingReplace(marks: Record<string, Record<string, unknown>>): [string, Record<string, unknown>] | null {
  return Object.entries(marks).find(([, mark]) => (
    mark.kind === 'replace'
    && mark.status === 'pending'
  )) ?? null;
}

async function run(): Promise<void> {
  const dbName = `zoon-suggestion-source-${Date.now()}-${randomUUID()}.db`;
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
  const { executeDocumentOperationAsync } = await import('../../server/document-engine.ts');

  try {
    const slug = `source-confirm-${randomUUID()}`;
    db.createDocument(slug, 'Original sentence.', {}, 'Source confirmation contract');

    const comment = await executeDocumentOperationAsync(slug, 'POST', '/marks/comment', {
      by: 'human:pm',
      quote: 'Original sentence.',
      text: '@zoon 改得更简洁',
    });
    assert(comment.status === 200, `Expected comment add 200, got ${comment.status}`);
    const sourceCommentId = String(comment.body.markId ?? '');
    assert(sourceCommentId, 'Expected comment response to expose markId');

    const suggestion = await executeDocumentOperationAsync(slug, 'POST', '/marks/suggest-replace', {
      by: 'ai:codex',
      quote: 'Original sentence.',
      content: 'Short sentence.',
      sourceMarkId: sourceCommentId,
      sourceCommentId,
    });
    assert(suggestion.status === 200, `Expected source suggestion 200, got ${suggestion.status}`);

    const reply = await executeDocumentOperationAsync(slug, 'POST', '/marks/reply', {
      by: 'ai:codex',
      markId: sourceCommentId,
      text: '已生成替换建议，请确认是否替换。',
    });
    assert(reply.status === 200, `Expected comment reply 200, got ${reply.status}`);

    let doc = db.getDocumentBySlug(slug)!;
    assert(doc.markdown.includes('Original sentence.'), 'Expected pending suggestion to keep original markdown');
    assert(!doc.markdown.includes('Short sentence.'), 'Expected pending suggestion content not to enter markdown');

    let marks = parseMarks(doc.marks);
    let pendingEntry = findPendingReplace(marks);
    assert(Boolean(pendingEntry), 'Expected source suggestion to create a pending replace mark');
    assert(pendingEntry![1].sourceMarkId === sourceCommentId, 'Expected suggestion to keep sourceMarkId');
    assert(pendingEntry![1].sourceCommentId === sourceCommentId, 'Expected suggestion to keep sourceCommentId');

    const resolved = await executeDocumentOperationAsync(slug, 'POST', '/marks/resolve', {
      by: 'human:pm',
      markId: sourceCommentId,
    });
    assert(resolved.status === 200, `Expected comment resolve 200, got ${resolved.status}`);

    doc = db.getDocumentBySlug(slug)!;
    assert(doc.markdown.includes('Original sentence.'), 'Expected resolving the comment not to accept the suggestion');
    marks = parseMarks(doc.marks);
    pendingEntry = findPendingReplace(marks);
    assert(Boolean(pendingEntry), 'Expected suggestion to remain pending after comment resolve');

    const accepted = await executeDocumentOperationAsync(slug, 'POST', '/marks/accept', {
      by: 'human:pm',
      markId: pendingEntry![0],
    });
    assert(accepted.status === 200, `Expected human accept 200, got ${accepted.status}`);
    doc = db.getDocumentBySlug(slug)!;
    assert(doc.markdown.includes('Short sentence.'), 'Expected human confirmation to apply suggestion');
    assert(!doc.markdown.includes('Original sentence.'), 'Expected original text to be replaced after confirmation');

    const bypassSlug = `source-bypass-${randomUUID()}`;
    db.createDocument(bypassSlug, 'Bypass original.', {}, 'Source confirmation bypass contract');
    const bypassComment = await executeDocumentOperationAsync(bypassSlug, 'POST', '/marks/comment', {
      by: 'human:pm',
      quote: 'Bypass original.',
      text: '@zoon 直接改会绕过确认',
    });
    assert(bypassComment.status === 200, `Expected bypass comment 200, got ${bypassComment.status}`);
    const bypassSourceId = String(bypassComment.body.markId ?? '');
    assert(bypassSourceId, 'Expected bypass comment markId');

    const bypass = await executeDocumentOperationAsync(bypassSlug, 'POST', '/marks/suggest-replace', {
      by: 'ai:codex',
      quote: 'Bypass original.',
      content: 'Bypass accepted.',
      status: 'accepted',
      sourceMarkId: bypassSourceId,
      sourceCommentId: bypassSourceId,
    });
    assert(bypass.status === 409, `Expected source accepted suggestion 409, got ${bypass.status}`);
    assert(bypass.body.code === 'CONFIRMATION_REQUIRED', `Expected CONFIRMATION_REQUIRED, got ${String(bypass.body.code)}`);

    const bypassDoc = db.getDocumentBySlug(bypassSlug)!;
    assert(bypassDoc.markdown.includes('Bypass original.'), 'Expected bypass attempt to leave original markdown');
    assert(!bypassDoc.markdown.includes('Bypass accepted.'), 'Expected bypass content not to enter markdown');
    assert(!findPendingReplace(parseMarks(bypassDoc.marks)), 'Expected rejected bypass not to leave a pending suggestion');

    console.log('✓ comment-sourced AI suggestions stay pending until human confirmation');
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
