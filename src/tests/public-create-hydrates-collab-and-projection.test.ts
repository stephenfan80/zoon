import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: POST /api/public/documents 在以前只做 DB insert + HTML snapshot，Y.doc
// hydration 和 markdown projection 都要等第一个 WebSocket onLoadDocument / 第一次
// /state 惰性触发。后果在生产上看到两个症状：
//
//   (1) 浏览器刚打开新文档，顶栏一直黄灯（Syncing...）—— Y.doc 从 DB hydrate 过程中
//       `collabUnsyncedChanges > 0` / `isSynced=false` 窗口被放大到用户可感知
//   (2) agent 一建完文档立刻打 GET /api/agent/:slug/state，返回
//       `mutationReady:false, repair_pending:true, readSource:yjs_fallback`，
//       轮询 60 次拿不到 ready 状态，第一条 edit 就卡住
//
// 修复：创建完成后（res.json 之前）主动调用 applyCanonicalDocumentToCollab +
// queueProjectionRepair，让文档"出生即就绪"。失败不阻塞返回（只是退回旧的懒
// hydrate 路径）。
//
// 这个测试用源码扫描 lock 三条不变式：
//   1. public-entry-routes.ts 仍然 import applyCanonicalDocumentToCollab /
//      queueProjectionRepair / getCollabRuntime
//   2. POST /api/public/documents handler 是 async 的（await apply 需要）
//   3. handler body 在 res.json 之前既调用了 applyCanonicalDocumentToCollab 又调用
//      了 queueProjectionRepair，source 是 'public.create'
//   4. 'public.create' 没被 shouldBlockLegacyLiveApplySource 拉黑（否则 apply 在
//      server/collab.ts 里会被 early-return 掉）

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const publicRoutesSource = readFileSync(
  path.join(repoRoot, 'server', 'public-entry-routes.ts'),
  'utf8',
);
const collabSource = readFileSync(path.join(repoRoot, 'server', 'collab.ts'), 'utf8');

function assertContains(src: string, needle: string, label: string) {
  assert(src.includes(needle), `${label}: expected source to contain ${JSON.stringify(needle)}`);
}

// --- 1) Imports ---
for (const sym of ['applyCanonicalDocumentToCollab', 'queueProjectionRepair', 'getCollabRuntime']) {
  assertContains(
    publicRoutesSource,
    sym,
    `public-entry-routes.ts should reference ${sym}`,
  );
}
assertContains(
  publicRoutesSource,
  "from './collab.js'",
  'public-entry-routes.ts should import from ./collab.js',
);

// --- 2) Handler is async ---
const handlerStart = publicRoutesSource.indexOf(
  "publicEntryRoutes.post('/api/public/documents'",
);
assert(handlerStart !== -1, 'POST /api/public/documents handler not found');
const handlerHeaderEnd = publicRoutesSource.indexOf('{', handlerStart);
const handlerHeader = publicRoutesSource.slice(handlerStart, handlerHeaderEnd);
assert(
  /async\s*\(req/.test(handlerHeader),
  'POST /api/public/documents handler must be async (await on applyCanonicalDocumentToCollab)',
);

// --- 3) Hydrate + projection-repair calls appear in handler body, before res.json ---
// 抓 handler body：从 handlerStart 到下一个顶层 "// ---" 注释块。
const nextBlock = publicRoutesSource.indexOf('\n// ----------', handlerStart + 1);
const handlerBody = publicRoutesSource.slice(
  handlerStart,
  nextBlock === -1 ? publicRoutesSource.length : nextBlock,
);

const applyIdx = handlerBody.indexOf('applyCanonicalDocumentToCollab(slug');
const queueIdx = handlerBody.indexOf("queueProjectionRepair(slug, 'public.create')");
const resJsonIdx = handlerBody.indexOf('res.json({');

assert(applyIdx !== -1, 'Handler must call applyCanonicalDocumentToCollab(slug, ...)');
assert(queueIdx !== -1, "Handler must call queueProjectionRepair(slug, 'public.create')");
assert(resJsonIdx !== -1, 'Handler must eventually call res.json(...)');
assert(
  applyIdx < resJsonIdx,
  'applyCanonicalDocumentToCollab must be called before res.json (otherwise the doc is still not hydrated when the URL returns)',
);
assert(
  queueIdx < resJsonIdx,
  'queueProjectionRepair must be called before res.json',
);

// apply must use source:'public.create' so it survives shouldBlockLegacyLiveApplySource
assertContains(
  handlerBody,
  "source: 'public.create'",
  "applyCanonicalDocumentToCollab must use source:'public.create'",
);

// --- 4) 'public.create' is not in the legacy-reverse-flow block list ---
// shouldBlockLegacyLiveApplySource lives in server/collab.ts. We don't want
// someone tightening that allowlist to include 'public.create' without noticing
// that it silently disables eager hydration here.
const blockFnStart = collabSource.indexOf('function shouldBlockLegacyLiveApplySource(');
assert(blockFnStart !== -1, 'shouldBlockLegacyLiveApplySource not found in server/collab.ts');
const blockFnEnd = collabSource.indexOf('\n}', blockFnStart);
const blockFnBody = collabSource.slice(blockFnStart, blockFnEnd);
assert(
  !blockFnBody.includes("'public.create'") && !blockFnBody.includes('"public.create"'),
  "shouldBlockLegacyLiveApplySource must NOT block source 'public.create' — that would re-break eager hydration",
);
// And also make sure no prefix rule would swallow it (agent*, rewrite:* currently used).
assert(
  !/startsWith\(['"]public/.test(blockFnBody),
  "shouldBlockLegacyLiveApplySource must not use a 'public*' prefix rule",
);

console.log(
  '✓ POST /api/public/documents eagerly hydrates Y.doc + queues projection repair before responding',
);
