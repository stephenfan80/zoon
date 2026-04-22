import { unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Ref-free boundary ops — insert_at_end / insert_at_start.
// Contract:
//   (1) No block ref required in the payload.
//   (2) No baseRevision / baseToken required; server auto-rebases and retries
//       on STALE_REVISION (append/prepend commute, so concurrent writes are safe).
//   (3) Multi-block markdown is parsed into N blocks and appended/prepended;
//       the authoritative final layout comes back via body.snapshot (agents
//       should use that, not the parse-time count — the markdown serializer
//       may rewrite tight lists as loose lists etc.).
//   (4) Empty / whitespace-only markdown → 400 EMPTY_MARKDOWN with a userHint
//       so the agent asks the user what they meant instead of silent-retrying.
//   (5) markdown > 50_000 bytes → 400 MARKDOWN_TOO_LARGE with sizeBytes/maxBytes
//       so the agent can split and retry.
//
// These tests drive applyAgentEditV2 directly, same pattern as
// agent-edit-v2.test.ts — no HTTP roundtrip, no feature flag gating.

async function run(): Promise<void> {
  const dbName = `proof-insert-at-end-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
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

  try {
    const slug = `refless-${Math.random().toString(36).slice(2, 10)}`;
    const markdown = ['# Title', '', 'First paragraph.', '', 'Second paragraph.'].join('\n');
    db.createDocument(slug, markdown, {}, 'Insert-at-end test');

    let doc = db.getDocumentBySlug(slug)!;
    assert(doc.revision === 1, 'initial revision should be 1');

    // 1) insert_at_end without baseRevision — single block.
    let result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      operations: [
        { op: 'insert_at_end', markdown: 'Appended paragraph.' },
      ],
    });
    assert(result.status === 200, `insert_at_end should return 200, got ${result.status}`);
    assert(isRecord(result.body), 'body must be a record');
    const body1 = result.body;
    assert(body1.success === true, 'body.success must be true');

    // Response snapshot is the contract for "chain the next op without re-reading".
    // Skill §2.A tells agents to plug snapshot.revision into baseRevision and pick
    // anchors from snapshot.blocks[*].ref. If that shape drifts, the skill lies.
    assert(isRecord(body1.snapshot), 'response.snapshot must be a record for chained writes');
    const snap = body1.snapshot as Record<string, unknown>;
    assert(typeof snap.revision === 'number', 'snapshot.revision must be a number for use as next baseRevision');
    assert(Array.isArray(snap.blocks) && snap.blocks.length > 0, 'snapshot.blocks must be a non-empty array');
    const firstBlock = (snap.blocks as unknown[])[0];
    assert(isRecord(firstBlock), 'snapshot.blocks[0] must be a record');
    assert(typeof (firstBlock as Record<string, unknown>).ref === 'string', 'snapshot.blocks[*].ref must be present for anchored ops');

    doc = db.getDocumentBySlug(slug)!;
    assert(doc.revision === 2, 'revision should increment');
    assert(doc.markdown.includes('Appended paragraph.'), 'appended content should land in markdown');
    assert(doc.markdown.trimEnd().endsWith('Appended paragraph.'), 'appended content should be at end');
    assert(
      snap.revision === doc.revision,
      `response snapshot.revision (${snap.revision}) must match DB revision (${doc.revision}) — agents rely on this to chain without re-reading`,
    );

    // 2) insert_at_end with multi-block markdown (heading + list).
    //    Milkdown's markdown serializer may rewrite tight lists as loose lists
    //    (blank line between items), so we don't pin block counts here —
    //    we verify the content landed instead.
    result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      operations: [
        { op: 'insert_at_end', markdown: '## 金句精选\n\n- 第一句\n- 第二句' },
      ],
    });
    assert(result.status === 200, `multi-block 200, got ${result.status}`);

    doc = db.getDocumentBySlug(slug)!;
    assert(doc.markdown.includes('## 金句精选'), 'heading should be appended');
    assert(doc.markdown.includes('第一句'), 'first list item should be appended');
    assert(doc.markdown.includes('第二句'), 'second list item should be appended');

    // 3) insert_at_start prepends.
    result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      operations: [
        { op: 'insert_at_start', markdown: '> TL;DR prelude.' },
      ],
    });
    assert(result.status === 200, `insert_at_start 200, got ${result.status}`);

    doc = db.getDocumentBySlug(slug)!;
    assert(doc.markdown.trimStart().startsWith('> TL;DR prelude.'), 'prepended block should come first');

    // 4) EMPTY_MARKDOWN for whitespace-only payload.
    result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      operations: [
        { op: 'insert_at_end', markdown: '   \n  ' },
      ],
    });
    assert(result.status === 400, `empty markdown should 400, got ${result.status}`);
    const emptyBody = result.body as Record<string, unknown>;
    assert(emptyBody.code === 'EMPTY_MARKDOWN', `expected EMPTY_MARKDOWN, got ${emptyBody.code}`);
    assert(
      typeof emptyBody.userHint === 'string' && (emptyBody.userHint as string).length > 0,
      'EMPTY_MARKDOWN response must include a non-empty userHint for the agent to relay',
    );

    // 5) MARKDOWN_TOO_LARGE for >50KB payload.
    const giantMarkdown = 'x '.repeat(26_000); // ~52KB
    result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      operations: [
        { op: 'insert_at_end', markdown: giantMarkdown },
      ],
    });
    assert(result.status === 400, `oversized payload should 400, got ${result.status}`);
    const largeBody = result.body as Record<string, unknown>;
    assert(largeBody.code === 'MARKDOWN_TOO_LARGE', `expected MARKDOWN_TOO_LARGE, got ${largeBody.code}`);
    assert(typeof largeBody.sizeBytes === 'number' && (largeBody.sizeBytes as number) > 50_000, 'sizeBytes must be reported');
    assert(largeBody.maxBytes === 50_000, 'maxBytes must be reported as 50_000');

    // 6) No STALE_REVISION even with a deliberately stale-looking call
    //    (no baseRevision sent → server auto-rebases to current).
    //    Sanity: revision is whatever we're at; we fire again without baseRevision.
    const before = db.getDocumentBySlug(slug)!;
    result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      operations: [
        { op: 'insert_at_end', markdown: 'Another line.' },
      ],
    });
    assert(result.status === 200, `ref-free call should succeed without baseRevision, got ${result.status}`);
    const after = db.getDocumentBySlug(slug)!;
    assert(after.revision === before.revision + 1, 'revision must bump by exactly 1');

    // 7) Two rapid sequential calls without baseRevision — both succeed,
    //    simulating "concurrent appends" that should commute.
    const r7a = await applyAgentEditV2(slug, {
      by: 'ai:a',
      operations: [{ op: 'insert_at_end', markdown: 'Agent A wrote this.' }],
    });
    const r7b = await applyAgentEditV2(slug, {
      by: 'ai:b',
      operations: [{ op: 'insert_at_end', markdown: 'Agent B wrote this.' }],
    });
    assert(r7a.status === 200 && r7b.status === 200, 'both concurrent-ish appends should succeed');

    const final = db.getDocumentBySlug(slug)!;
    assert(final.markdown.includes('Agent A wrote this.'), 'A must land');
    assert(final.markdown.includes('Agent B wrote this.'), 'B must land');

    // 8) Mixed: ref-free op + explicit baseRevision should still work
    //    (the auto-rebase path is not required; the caller may opt in).
    result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      baseRevision: final.revision,
      operations: [
        { op: 'insert_at_end', markdown: 'Explicit revision append.' },
      ],
    });
    assert(result.status === 200, `explicit baseRevision should still succeed, got ${result.status}`);

    // 9) Unknown-op rejection path still fires (regression guard).
    result = await applyAgentEditV2(slug, {
      by: 'ai:test',
      baseRevision: db.getDocumentBySlug(slug)!.revision,
      operations: [
        { op: 'insert_at_nowhere', markdown: 'nope' } as unknown as Record<string, unknown>,
      ],
    });
    assert(result.status === 400, `unknown op should 400, got ${result.status}`);
    assert(
      (result.body as Record<string, unknown>).code === 'INVALID_OPERATIONS',
      'unknown op should come back as INVALID_OPERATIONS',
    );

    // 10) Contract closure for B (chain writes): skill §2.A tells agents to
    //     feed response.snapshot.revision + blocks[*].ref into the next op
    //     without re-reading. This case drives that loop — an anchored op
    //     whose baseRevision + ref come only from the previous response.
    //     If the server rejects that pair (because the response lied about
    //     the post-write state), the promise breaks.
    const r10a = await applyAgentEditV2(slug, {
      by: 'ai:test',
      operations: [
        { op: 'insert_at_end', markdown: 'Seed block for chain test.' },
      ],
    });
    assert(r10a.status === 200, `chain seed insert_at_end 200, got ${r10a.status}`);
    const seedSnap = (r10a.body as { snapshot: { revision: number; blocks: Array<{ ref: string }> } }).snapshot;
    const lastRef = seedSnap.blocks[seedSnap.blocks.length - 1].ref;
    const seedRev = seedSnap.revision;

    // Reuse the response snapshot verbatim — no /snapshot fetch between.
    const r10b = await applyAgentEditV2(slug, {
      by: 'ai:test',
      baseRevision: seedRev,
      operations: [
        {
          op: 'insert_after',
          ref: lastRef,
          blocks: [{ markdown: 'Chained anchored insert, no re-read.' }],
        },
      ],
    });
    assert(
      r10b.status === 200,
      `chain anchored insert using response snapshot must succeed, got ${r10b.status} body=${JSON.stringify(r10b.body)}`,
    );
    const chainedDoc = db.getDocumentBySlug(slug)!;
    assert(
      chainedDoc.markdown.includes('Chained anchored insert, no re-read.'),
      'chained insert_after content must land',
    );
    assert(
      chainedDoc.revision === seedRev + 1,
      `chained write should bump revision by exactly 1 (got ${chainedDoc.revision}, expected ${seedRev + 1})`,
    );

    console.log('✓ insert_at_end / insert_at_start ref-free ops behave per contract');
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
