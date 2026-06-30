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
  const dbName = `zoon-suggestion-proof-align-${Date.now()}-${randomUUID()}.db`;
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
    const slug = `proof-align-pending-${randomUUID()}`;
    db.createDocument(slug, 'Original sentence.', {}, 'Proof suggestion pending contract');

    const comment = await executeDocumentOperationAsync(slug, 'POST', '/marks/comment', {
      by: 'human:pm',
      quote: 'Original sentence.',
      text: '@zoon 改得更简洁',
    });
    assert(comment.status === 200, `Expected comment add 200, got ${comment.status}`);
    const commentId = String(comment.body.markId ?? '');
    assert(commentId, 'Expected comment response to expose markId');

    const suggestion = await executeDocumentOperationAsync(slug, 'POST', '/marks/suggest-replace', {
      by: 'ai:codex',
      quote: 'Original sentence.',
      content: 'Short sentence.',
      sourceMarkId: commentId,
      sourceCommentId: commentId,
    });
    assert(suggestion.status === 200, `Expected replace suggestion 200, got ${suggestion.status}`);

    const reply = await executeDocumentOperationAsync(slug, 'POST', '/marks/reply', {
      by: 'ai:codex',
      markId: commentId,
      text: '已处理。',
    });
    assert(reply.status === 200, `Expected comment reply 200, got ${reply.status}`);

    let doc = db.getDocumentBySlug(slug)!;
    assert(doc.markdown.includes('Original sentence.'), 'Expected pending suggestion to keep original markdown');
    assert(!doc.markdown.includes('Short sentence.'), 'Expected pending suggestion content not to enter markdown');

    let marks = parseMarks(doc.marks);
    let pendingEntry = findPendingReplace(marks);
    assert(Boolean(pendingEntry), 'Expected suggestion to create a pending replace mark');
    assert(pendingEntry![1].sourceMarkId === undefined, 'Expected sourceMarkId not to be stored');
    assert(pendingEntry![1].sourceCommentId === undefined, 'Expected sourceCommentId not to be stored');

    const resolved = await executeDocumentOperationAsync(slug, 'POST', '/marks/resolve', {
      by: 'human:pm',
      markId: commentId,
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
    assert(accepted.status === 200, `Expected accept 200, got ${accepted.status}`);
    doc = db.getDocumentBySlug(slug)!;
    assert(doc.markdown.includes('Short sentence.'), 'Expected accept to apply suggestion');
    assert(!doc.markdown.includes('Original sentence.'), 'Expected original text to be replaced after accept');

    const acceptedSlug = `proof-align-accepted-${randomUUID()}`;
    db.createDocument(acceptedSlug, 'Bypass original.', {}, 'Proof accepted suggestion contract');
    const acceptedComment = await executeDocumentOperationAsync(acceptedSlug, 'POST', '/marks/comment', {
      by: 'human:pm',
      quote: 'Bypass original.',
      text: '@zoon 直接改',
    });
    assert(acceptedComment.status === 200, `Expected accepted comment 200, got ${acceptedComment.status}`);
    const acceptedCommentId = String(acceptedComment.body.markId ?? '');

    const acceptedSuggestion = await executeDocumentOperationAsync(acceptedSlug, 'POST', '/marks/suggest-replace', {
      by: 'ai:codex',
      quote: 'Bypass original.',
      content: 'Bypass accepted.',
      status: 'accepted',
      sourceMarkId: acceptedCommentId,
      sourceCommentId: acceptedCommentId,
    });
    assert(acceptedSuggestion.status === 200, `Expected accepted suggestion 200, got ${acceptedSuggestion.status}`);

    const acceptedDoc = db.getDocumentBySlug(acceptedSlug)!;
    assert(acceptedDoc.markdown.includes('Bypass accepted.'), 'Expected status accepted to apply content');
    assert(!acceptedDoc.markdown.includes('Bypass original.'), 'Expected original accepted content to be replaced');
    assert(!findPendingReplace(parseMarks(acceptedDoc.marks)), 'Expected accepted suggestion not to leave a pending suggestion');

    const rejectSlug = `proof-align-reject-${randomUUID()}`;
    db.createDocument(rejectSlug, 'Keep original.', {}, 'Proof reject suggestion contract');
    const rejectSuggestion = await executeDocumentOperationAsync(rejectSlug, 'POST', '/marks/suggest-replace', {
      by: 'ai:codex',
      quote: 'Keep original.',
      content: 'Rejected replacement.',
    });
    assert(rejectSuggestion.status === 200, `Expected reject-cycle suggestion 200, got ${rejectSuggestion.status}`);
    const rejectPending = findPendingReplace(parseMarks(db.getDocumentBySlug(rejectSlug)!.marks));
    assert(Boolean(rejectPending), 'Expected reject-cycle suggestion to be pending before reject');

    const rejected = await executeDocumentOperationAsync(rejectSlug, 'POST', '/marks/reject', {
      by: 'human:pm',
      markId: rejectPending![0],
    });
    assert(rejected.status === 200, `Expected reject 200, got ${rejected.status}`);
    const rejectedDoc = db.getDocumentBySlug(rejectSlug)!;
    assert(rejectedDoc.markdown.includes('Keep original.'), 'Expected reject to keep original markdown');
    assert(!rejectedDoc.markdown.includes('Rejected replacement.'), 'Expected reject not to apply suggestion content');
    assert(!findPendingReplace(parseMarks(rejectedDoc.marks)), 'Expected rejected suggestion not to remain pending');

    console.log('✓ suggestions follow Proof pending, accepted, and rejected semantics');
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
