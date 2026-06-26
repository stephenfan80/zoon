import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ensureInitialAuthoredMarks,
  seedInitialAuthoredMarks,
} from '../../server/initial-authored-marks.ts';
import { getMarkColor, isAI, type StoredMark } from '../formats/marks.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

async function run(): Promise<void> {
  const seeded = await seedInitialAuthoredMarks(
    '# 默认文档\n\n系统生成的引导内容。\n\n## 下一步\n\n让 Agent 继续写。',
    'system:default-template',
    '2026-06-26T00:00:00.000Z',
  );
  const seededMarks = Object.values(seeded);
  assert(seededMarks.length >= 4, `Expected block-level authored marks, got ${seededMarks.length}`);
  assert(
    seededMarks.every((mark) => mark.kind === 'authored' && mark.by === 'ai:zoon-template'),
    'Expected system/default seed content to be persisted as agent-authored',
  );
  assert(
    seededMarks.every((mark) => mark.range && mark.range.to > mark.range.from && typeof mark.quote === 'string' && mark.quote.length > 0),
    'Expected initial authored marks to carry usable ranges and quotes',
  );
  assert(seededMarks.some((mark) => mark.startRel && mark.endRel), 'Expected text-relative anchors for seeded authored marks');

  const existingHuman: StoredMark = {
    kind: 'authored',
    by: 'human:owner',
    createdAt: '2026-06-26T00:00:00.000Z',
    range: { from: 1, to: 5 },
    quote: '保留',
  };
  const preserved = await ensureInitialAuthoredMarks('# 保留\n\n已有来源。', { 'authored:human:1-5': existingHuman }, 'ai:agent');
  assert(Object.values(preserved).length === 1, 'Expected existing authored marks not to be overwritten');
  assert(preserved['authored:human:1-5']?.by === 'human:owner', 'Expected existing human authored identity to remain intact');

  const withComment = await ensureInitialAuthoredMarks(
    '# 新建\n\n没有来源但有评论。',
    {
      'comment:human:1': {
        kind: 'comment',
        by: 'human:owner',
        createdAt: '2026-06-26T00:00:00.000Z',
        range: { from: 1, to: 3 },
        quote: '新建',
        data: { text: '看这里', thread: 't1', resolved: false },
      },
    },
    'ai:agent-push',
  );
  assert(
    Object.values(withComment).some((mark) => mark.kind === 'comment'),
    'Expected non-authored marks to be preserved while seeding provenance',
  );
  assert(
    Object.values(withComment).some((mark) => mark.kind === 'authored' && mark.by === 'ai:agent-push'),
    'Expected missing provenance to be seeded with the requested agent identity',
  );

  assert(isAI('agent:codex'), 'Expected agent: scoped identities to count as Agent authors');
  assert(getMarkColor('system') === getMarkColor('ai'), 'Expected system/default provenance color to use the Agent purple');

  const publicEntryRoutes = read('server/public-entry-routes.ts');
  const routes = read('server/routes.ts');
  assert(publicEntryRoutes.includes('ensureInitialAuthoredMarks(initialMarkdown, {}, initialActor)'), 'Expected public document creation to seed initial authored marks');
  assert(routes.includes("ensureInitialAuthoredMarks(initialMarkdown, {}, 'ai:zoon-template')"), 'Expected /new to seed template content as Agent-authored');
  assert(routes.includes('resolveInitialDocumentActor(req, req.body)'), 'Expected API document creation to use the request agent identity when available');

  console.log('initial-authored-marks.test.ts: ok');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
